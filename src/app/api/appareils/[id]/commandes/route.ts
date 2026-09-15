import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDevice } from '@/lib/device-auth';
import { claimCommand, EngineError } from '@/lib/execution/engine';
import { publishCommandToDevice } from '@/lib/firebase-admin';
import { decryptSecret } from '@/lib/secret-data';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const auth = await requireDevice(req, id); if (auth.response) return auth.response;
  const device = auth.device!;
  const command = await prisma.commande.findFirst({ where: { appareilId: id, etat: 'attente_ussd' }, orderBy: { dateCreation: 'asc' }, include: { forfait: true } });
  if (!command) return NextResponse.json({ ok: true, commande: null });
  try {
    const claimed = await claimCommand(command.id, id);
    await publishCommandToDevice({ deviceId: id, commandId: claimed.id, reference: claimed.reference, operator: claimed.operateur, syntax: command.forfait.syntaxe, numero: command.numeroChiffre ? decryptSecret(command.numeroChiffre) : (() => { throw new Error('NUMERO_NON_DISPONIBLE') })(), forfait: command.forfait.nom, montantFcfa: claimed.montantFcfa, leaseToken: claimed.leaseToken!, leaseExpiresAt: claimed.leaseExpiresAt! });
    return NextResponse.json({ ok: true, commande: claimed });
  } catch (e) {
    if (e instanceof EngineError) return NextResponse.json({ message: e.message, code: e.code }, { status: 409 });
    return NextResponse.json({ message: 'Erreur interne' }, { status: 500 });
  }
}
