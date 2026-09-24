import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-auth';

const SERVER_FRESHNESS_MS = 2 * 60 * 1000;

export async function POST(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth.response) return auth.response;
  const b = await req.json().catch(() => ({}));
  const operateur = String(b.operateur ?? '').trim().toLowerCase();
  const montant = Number(b.montantFcfa ?? 0);
  const planQuery = String(b.planQuery ?? '').trim();
  if (!['orange', 'moov', 'mtn'].includes(operateur) || !Number.isInteger(montant) || montant <= 0) {
    return NextResponse.json({ message: 'Opérateur ou montant invalide' }, { status: 400 });
  }

  const freshSince = new Date(Date.now() - SERVER_FRESHNESS_MS);
  const appareil = await prisma.appareil.findFirst({
    where: { operateur, actif: true, derniereActivite: { gte: freshSince } },
    orderBy: { derniereActivite: 'desc' },
  });
  if (!appareil) return NextResponse.json({ available: false, reason: 'SERVEUR_ABSENT' });

  const busy = await prisma.commande.findFirst({
    where: { appareilId: appareil.id, etat: { in: ['attente_paiement', 'attente_ussd', 'en_cours'] } },
    select: { id: true },
  });
  if (busy) return NextResponse.json({ available: false, reason: 'OPERATEUR_OCCUPE' });

  let forfait = await prisma.forfait.findFirst({
    where: { operateur, actif: true, prixFcfa: montant, ...(planQuery ? { nom: { contains: planQuery, mode: 'insensitive' } } : {}) },
    orderBy: { nom: 'asc' },
  });
  if (!forfait) forfait = await prisma.forfait.findFirst({ where: { operateur, actif: true, prixFcfa: montant }, orderBy: { nom: 'asc' } });
  if (!forfait) return NextResponse.json({ available: false, reason: 'FORFAIT_INDISPONIBLE' });

  return NextResponse.json({
    available: true,
    appareilId: appareil.id,
    forfait: { id: forfait.id, nom: forfait.nom, prixFcfa: forfait.prixFcfa },
  });
}
