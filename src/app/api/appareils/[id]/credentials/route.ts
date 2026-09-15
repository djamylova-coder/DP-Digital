import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { hashDeviceSecret, newDeviceSecret } from '@/lib/device-auth';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const device = await prisma.appareil.findUnique({ where: { id } });
  if (!device) return NextResponse.json({ message: 'Appareil introuvable' }, { status: 404 });
  const secret = newDeviceSecret();
  await prisma.appareil.update({ where: { id }, data: { secretHache: hashDeviceSecret(secret) } });
  await prisma.audit.create({ data: { compteId: auth.session.compteId, action: 'DEVICE_CREDENTIAL_ROTATED', details: JSON.stringify({ deviceId: id }) } });
  return NextResponse.json({ ok: true, appareilId: id, secret, warning: 'Ce secret est affiché une seule fois. Conservez-le côté serveur/appareil.' });
}
