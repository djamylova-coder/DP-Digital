import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if (auth.response) return auth.response;
  const { id } = await params;
  const command = await prisma.commande.findFirst({
    where: { id, compteId: auth.session!.compteId },
    select: { id: true, reference: true, etat: true, resultatExecution: true, resultatUssd: true, failureCode: true, dateDerniereMaj: true }
  });
  if (!command) return NextResponse.json({ message: 'Commande introuvable.' }, { status: 404 });
  return NextResponse.json({ ok: true, commande: command });
}
