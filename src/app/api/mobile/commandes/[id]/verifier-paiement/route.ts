import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-auth';
import { publishPaymentVerificationToDevice } from '@/lib/firebase-admin';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const source = String(body.source ?? 'conversation');
  const command = await prisma.commande.findFirst({
    where: { id, compteId: auth.session!.compteId },
    include: { notifications: { orderBy: { dateReception: 'desc' }, take: 1 } }
  });
  if (!command) return NextResponse.json({ message: 'Commande introuvable.' }, { status: 404 });

  const terminal = command.etat === 'termine' || command.etat === 'echec' || command.etat === 'traitement_manuel';
  await prisma.audit.create({ data: { commandeId: id, action: 'DEMANDE_VERIFICATION_PAIEMENT', details: JSON.stringify({ source, terminal, notificationDerniere: command.notifications[0]?.id ?? null }) } });

  if (!terminal && command.appareilId) {
    try {
      await publishPaymentVerificationToDevice({
        deviceId: command.appareilId,
        requestId: crypto.randomUUID(),
        commandId: command.id,
        montantFcfa: command.montantFcfa,
      });
    } catch (error) {
      console.error('Publication de la demande de vérification Wave impossible', error);
    }
  }

  return NextResponse.json({
    ok: true,
    verified: command.etat !== 'attente_paiement',
    etat: command.etat,
    resultatExecution: command.resultatExecution,
    resultatUssd: command.resultatUssd,
    failureCode: command.failureCode,
    verificationRequested: !terminal,
    message: terminal
      ? 'Le site a retourné le résultat final de la commande.'
      : 'Le site a demandé au serveur de vérifier la présence du paiement Wave. La validation réelle dépend de la notification Wave reçue par le serveur.'
  });
}
