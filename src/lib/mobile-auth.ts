import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function requireMobileUser(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { session: null, response: NextResponse.json({ message: 'Session utilisateur requise' }, { status: 401 }) };
  const session = await prisma.session.findUnique({ where: { jeton: token }, include: { compte: true } });
  if (!session || session.dateRevocation || session.dateExpiration <= new Date() || !session.compte.actif || session.compte.famille !== 'utilisateur') {
    return { session: null, response: NextResponse.json({ message: 'Session utilisateur invalide ou expirée' }, { status: 401 }) };
  }
  return { session, response: null };
}
