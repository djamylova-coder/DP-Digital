import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDevice } from '@/lib/device-auth';
import { recordExecutionResult, EngineError } from '@/lib/execution/engine';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const commandId = String(body.commandId ?? '');
    const deviceId = String(body.deviceId ?? '');
    const leaseToken = String(body.leaseToken ?? '');
    const result = String(body.result ?? '').toUpperCase() as 'SUCCESS' | 'FAILURE' | 'UNKNOWN';
    const event = String(body.event ?? '');
    if (!commandId || !deviceId || !leaseToken || !['SUCCESS', 'FAILURE', 'UNKNOWN'].includes(result)) {
      return NextResponse.json({ message: 'Payload invalide.' }, { status: 400 });
    }
    const auth = await requireDevice(req, deviceId);
    if (auth.response) return auth.response;

    const command = await prisma.commande.findUnique({ where: { id: commandId }, select: { appareilId: true } });
    if (!command || command.appareilId !== deviceId) return NextResponse.json({ message: 'Commande/appareil incohérents.' }, { status: 409 });

    // EXECUTION_STARTED is only an event; it must not finalize the command.
    if (event === 'EXECUTION_STARTED') {
      return NextResponse.json({ ok: true, recorded: false });
    }

    const updated = await recordExecutionResult(commandId, leaseToken, result, {
      resultatUssd: typeof body.rawResponse === 'string' ? body.rawResponse : undefined,
      failureCode: typeof body.failureCode === 'string' ? body.failureCode : undefined,
    });
    return NextResponse.json({ ok: true, recorded: true, state: updated.etat });
  } catch (e) {
    if (e instanceof EngineError) return NextResponse.json({ message: e.message, code: e.code }, { status: 409 });
    console.error(e);
    return NextResponse.json({ message: 'Erreur interne.' }, { status: 500 });
  }
}
