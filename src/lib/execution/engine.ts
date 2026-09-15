import crypto from 'node:crypto';
import { Prisma, EtatCommande, ResultatExecution } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type ExecutionResult = 'SUCCESS' | 'FAILURE' | 'UNKNOWN';

const transitions: Record<EtatCommande, EtatCommande[]> = {
  attente_paiement: ['attente_ussd'],
  attente_ussd: ['en_cours', 'echec', 'traitement_manuel'],
  en_cours: ['termine', 'echec', 'traitement_manuel'],
  termine: [],
  echec: [],
  traitement_manuel: [],
};

export function canTransition(from: EtatCommande, to: EtatCommande) {
  return transitions[from]?.includes(to) ?? false;
}

function resultEnum(result: ExecutionResult): ResultatExecution {
  return result === 'SUCCESS' ? ResultatExecution.success : result === 'FAILURE' ? ResultatExecution.failure : ResultatExecution.unknown;
}

/**
 * Claims one command for one device. The database transaction is the lock:
 * two concurrent workers cannot both claim the same device.
 */
export async function claimCommand(commandId: string, deviceId: string, leaseMs = 90_000) {
  const leaseToken = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + leaseMs);

  return prisma.$transaction(async (tx) => {
    const command = await tx.commande.findUnique({ where: { id: commandId } });
    if (!command) throw new EngineError('COMMAND_NOT_FOUND', 'Commande introuvable');
    if (command.appareilId !== deviceId) throw new EngineError('DEVICE_MISMATCH', 'Appareil non affecté à cette commande');
    if (!['attente_ussd', 'en_cours'].includes(command.etat)) {
      throw new EngineError('INVALID_STATE', 'Commande non exécutable dans son état actuel');
    }

    // Serialize concurrent claims. PostgreSQL SERIALIZABLE makes the read/check
    // and the following write one atomic decision at the database level.
    const active = await tx.commande.findFirst({
      where: {
        appareilId: deviceId,
        id: { not: commandId },
        etat: 'en_cours',
        OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { gt: now } }],
      },
      select: { id: true },
    });
    if (active) throw new EngineError('DEVICE_BUSY', 'Appareil déjà occupé');

    const updated = await tx.commande.update({
      where: { id: commandId },
      data: {
        etat: 'en_cours',
        attemptCount: { increment: 1 },
        executionStartedAt: command.executionStartedAt ?? now,
        leaseToken,
        leaseExpiresAt: expires,
      },
    });
    await tx.appareil.update({ where: { id: deviceId }, data: { statut: 'occupe', derniereActivite: now } });
    await tx.audit.create({ data: { commandeId: commandId, action: 'EXECUTION_CLAIMED', details: JSON.stringify({ deviceId, leaseExpiresAt: expires.toISOString() }) } });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** Records the execution result. UNKNOWN is never converted automatically to success/failure. */
export async function recordExecutionResult(commandId: string, leaseToken: string, result: ExecutionResult, details?: { resultatUssd?: string; failureCode?: string }) {
  return prisma.$transaction(async (tx) => {
    const command = await tx.commande.findUnique({ where: { id: commandId } });
    if (!command) throw new EngineError('COMMAND_NOT_FOUND', 'Commande introuvable');
    if (command.leaseToken !== leaseToken) throw new EngineError('LEASE_INVALID', 'Verrou d’exécution invalide ou expiré');
    if (!command.leaseExpiresAt || command.leaseExpiresAt <= new Date()) throw new EngineError('LEASE_EXPIRED', 'Verrou d’exécution expiré');
    if (command.etat !== 'en_cours') throw new EngineError('INVALID_STATE', 'Commande non active');

    const now = new Date();
    const mapped = resultEnum(result);
    const nextState: EtatCommande = result === 'SUCCESS' ? 'termine' : result === 'FAILURE' ? 'echec' : 'traitement_manuel';
    const updated = await tx.commande.update({
      where: { id: commandId },
      data: {
        etat: nextState,
        resultatExecution: mapped,
        resultatUssd: details?.resultatUssd,
        failureCode: details?.failureCode,
        dateExecution: result === 'UNKNOWN' ? undefined : now,
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });
    if (command.appareilId) {
      const stillBusy = await tx.commande.findFirst({ where: { appareilId: command.appareilId, etat: 'en_cours', leaseExpiresAt: { gt: now }, id: { not: commandId } }, select: { id: true } });
      await tx.appareil.update({ where: { id: command.appareilId }, data: { statut: stillBusy ? 'occupe' : 'disponible', derniereActivite: now } });
    }
    await tx.audit.create({ data: { commandeId: commandId, action: 'EXECUTION_RESULT', details: JSON.stringify({ from: command.etat, to: nextState, result, failureCode: details?.failureCode ?? null }) } });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export class EngineError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
