import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-auth';
import { encryptSecret, maskPhone } from '@/lib/secret-data';
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';

const SERVER_FRESHNESS_MS = 2 * 60 * 1000;

function publicCommand(row: { id: string; reference: string; etat: string; resultatExecution: unknown; dateDerniereMaj: Date }) {
  return {
    id: row.id,
    reference: row.reference,
    etat: row.etat,
    resultatExecution: row.resultatExecution,
    dateDerniereMaj: row.dateDerniereMaj,
  };
}

export async function POST(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth.response) return auth.response;
  const b = await req.json().catch(() => ({}));
  const operateur = String(b.operateur ?? '').trim().toLowerCase();
  const numero = String(b.numero ?? '').replace(/\s+/g, '');
  const forfaitId = String(b.forfaitId ?? '');
  const montantFcfa = Number(b.montantFcfa ?? 0);
  if (!['orange', 'moov', 'mtn'].includes(operateur) || !/^\+?[0-9]{8,15}$/.test(numero) || !forfaitId || !Number.isInteger(montantFcfa)) {
    return NextResponse.json({ message: 'Données de commande invalides' }, { status: 400 });
  }

  const forfait = await prisma.forfait.findUnique({ where: { id: forfaitId } });
  if (!forfait || !forfait.actif || forfait.operateur !== operateur || forfait.prixFcfa !== montantFcfa) {
    return NextResponse.json({ message: 'Forfait indisponible ou incohérent' }, { status: 409 });
  }

  const freshSince = new Date(Date.now() - SERVER_FRESHNESS_MS);
  const appareil = await prisma.appareil.findFirst({
    where: { id: String(b.appareilId ?? ''), operateur, actif: true, derniereActivite: { gte: freshSince } },
  });
  if (!appareil) return NextResponse.json({ message: 'Serveur opérateur indisponible' }, { status: 409 });

  const busy = await prisma.commande.findFirst({
    where: { appareilId: appareil.id, etat: { in: ['attente_paiement', 'attente_ussd', 'en_cours'] } },
    select: { id: true },
  });
  if (busy) return NextResponse.json({ message: 'Opérateur actuellement occupé' }, { status: 409 });

  const idempotence = String(b.cleIdempotence ?? crypto.randomUUID());
  const reference = String(b.reference ?? `DP-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
  const existing = await prisma.commande.findUnique({ where: { cleIdempotence: idempotence }, select: { id: true, reference: true, etat: true, resultatExecution: true, dateDerniereMaj: true } });
  if (existing) return NextResponse.json({ ok: true, duplicate: true, commande: publicCommand(existing) });

  try {
    const row = await prisma.commande.create({
      data: {
        reference,
        cleIdempotence: idempotence,
        operateur,
        numeroMasque: maskPhone(numero),
        numeroChiffre: encryptSecret(numero),
        forfaitId,
        montantFcfa,
        appareilId: appareil.id,
        compteId: auth.session!.compteId,
      },
      select: { id: true, reference: true, etat: true, resultatExecution: true, dateDerniereMaj: true },
    });

    await prisma.audit.create({
      data: { compteId: auth.session!.compteId, commandeId: row.id, action: 'CREATION_COMMANDE_MOBILE', details: JSON.stringify({ reference, operateur }) },
    });
    return NextResponse.json({ ok: true, commande: publicCommand(row) }, { status: 201 });
  } catch (e) {
    // Violation d'unicité : soit la même clé d'idempotence (requête rejouée), soit un autre client
    // vient de prendre le serveur (règle « une seule commande active par serveur » en base).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const dup = await prisma.commande.findUnique({
        where: { cleIdempotence: idempotence },
        select: { id: true, reference: true, etat: true, resultatExecution: true, dateDerniereMaj: true },
      });
      if (dup) return NextResponse.json({ ok: true, duplicate: true, commande: publicCommand(dup) });
      return NextResponse.json({ message: 'Opérateur actuellement occupé' }, { status: 409 });
    }
    throw e;
  }
}
