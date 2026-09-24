import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { encryptSecret, maskPhone } from '@/lib/secret-data';

const createSchema = z.object({
  reference: z.string().min(3).max(100),
  cleIdempotence: z.string().min(8).max(200),
  operateur: z.string().min(1),
  numero: z.string().min(5).max(30),
  forfaitId: z.string().min(1),
  montantFcfa: z.number().int().positive(),
  appareilId: z.string().optional(),
});

export async function GET(req: Request) {
  const a = await requireAdmin(); if (a.response) return a.response;
  const u = new URL(req.url); const limit = Math.min(Math.max(Number(u.searchParams.get('limit') || 20), 1), 100); const etat = u.searchParams.get('etat') as any || undefined;
  const rows = await prisma.commande.findMany({ where: { etat }, orderBy: { dateCreation: 'desc' }, take: limit, include: { forfait: { select: { nom: true } } } });
  return NextResponse.json({ items: rows, nextCursor: rows.length === limit ? rows.at(-1)?.id : null });
}

export async function POST(req: Request) {
  const a = await requireAdmin(); if (a.response) return a.response;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: 'Payload invalide' }, { status: 400 });
  const b = parsed.data;
  const numeroChiffre = encryptSecret(b.numero);
  const numeroMasque = maskPhone(b.numero);
  const existing = await prisma.commande.findUnique({ where: { cleIdempotence: b.cleIdempotence } });
  if (existing) return NextResponse.json({ ok: true, duplicate: true, commande: existing });
  const forfait = await prisma.forfait.findUnique({ where: { id: b.forfaitId } });
  if (!forfait || !forfait.actif) return NextResponse.json({ message: 'Forfait indisponible' }, { status: 409 });
  if (forfait.operateur !== b.operateur || forfait.prixFcfa !== b.montantFcfa) return NextResponse.json({ message: 'Forfait et montant incohérents' }, { status: 409 });
  try {
    const row = await prisma.$transaction(async tx => {
      const created = await tx.commande.create({ data: { reference: b.reference, cleIdempotence: b.cleIdempotence, operateur: b.operateur, numeroMasque, numeroChiffre, forfaitId: b.forfaitId, montantFcfa: b.montantFcfa, appareilId: b.appareilId || null } });
      await tx.audit.create({ data: { compteId: a.session.compteId, commandeId: created.id, action: 'CREATION_COMMANDE', details: JSON.stringify({ reference: b.reference }) } });
      return created;
    });
    return NextResponse.json({ ok: true, duplicate: false, commande: row }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ message: 'Conflit : commande en double ou serveur déjà occupé' }, { status: 409 });
    }
    throw e;
  }
}
