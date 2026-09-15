import { NextResponse } from 'next/server';
import { recordExecutionResult, EngineError } from '@/lib/execution/engine';
import { requireDevice } from '@/lib/device-auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const command = await prisma.commande.findUnique({ where: { id }, select: { appareilId: true } });
  if (!command) return NextResponse.json({ message: 'Commande introuvable' }, { status: 404 });
  if (!command.appareilId) return NextResponse.json({ message: 'Commande sans appareil affecté' }, { status: 409 });
  const auth = await requireDevice(req, command.appareilId);
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => ({}));
  const result = String(body.resultat ?? body.result ?? '').toUpperCase();
  if (!['SUCCESS', 'FAILURE', 'UNKNOWN'].includes(result)) return NextResponse.json({ message: 'Résultat d’exécution invalide' }, { status: 400 });
  if (!body.lease_token) return NextResponse.json({ message: 'Verrou d’exécution requis' }, { status: 400 });

  try {
    const updated = await recordExecutionResult(id, String(body.lease_token), result as 'SUCCESS' | 'FAILURE' | 'UNKNOWN', {
      resultatUssd: body.resultat_ussd == null ? undefined : String(body.resultat_ussd),
      failureCode: body.failure_code == null ? undefined : String(body.failure_code),
    });
    return NextResponse.json({ ok: true, commande: updated, manual_required: result === 'UNKNOWN' });
  } catch (error) {
    if (error instanceof EngineError) return NextResponse.json({ message: error.message, code: error.code }, { status: error.code === 'COMMAND_NOT_FOUND' ? 404 : 409 });
    return NextResponse.json({ message: 'Erreur interne' }, { status: 500 });
  }
}
