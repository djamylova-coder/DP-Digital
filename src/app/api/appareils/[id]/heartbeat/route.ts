import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDevice } from '@/lib/device-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireDevice(req, id);
  if (auth.response) return auth.response;
  const body = await req.json().catch(() => ({}));
  const now = new Date();
  const requested = body.statut === 'occupe' ? 'occupe' : 'disponible';
  const active = await prisma.commande.findFirst({
    where: { appareilId: id, etat: 'en_cours', leaseExpiresAt: { gt: now } },
    select: { id: true },
  });
  const statut = active || requested === 'occupe' ? 'occupe' : 'disponible';
  const row = await prisma.appareil.update({ where: { id }, data: { derniereActivite: now, statut } });
  return NextResponse.json({ ok: true, appareilId: id, derniereActivite: row.derniereActivite, statut: row.statut });
}
