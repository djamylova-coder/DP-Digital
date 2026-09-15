import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin(); if (a.response) return a.response; const { id } = await params;
  const { decision } = await req.json().catch(() => ({}));
  if (!['EXECUTED_MANUALLY', 'REFUNDED'].includes(decision)) return NextResponse.json({ message: 'Décision invalide' }, { status: 400 });
  try {
    const result = await prisma.$transaction(async tx => {
      const row = await tx.commande.findUnique({ where: { id } });
      if (!row || row.etat !== 'traitement_manuel') throw new Error('MANUAL_NOT_AVAILABLE');
      const now = new Date();
      const updated = await tx.commande.update({ where: { id }, data: { etat: 'termine', decisionManuelle: decision, leaseToken: null, leaseExpiresAt: null, dateExecution: now } });
      await tx.audit.create({ data: { compteId: a.session!.compteId, commandeId: id, action: 'CLOTURE_MANUELLE', details: JSON.stringify({ decision }) } });
      if (row.appareilId) await tx.appareil.update({ where: { id: row.appareilId }, data: { statut: 'disponible', derniereActivite: now } });
      return updated;
    });
    return NextResponse.json({ ok: true, commande: result });
  } catch { return NextResponse.json({ message: 'Commande non disponible pour traitement manuel' }, { status: 409 }); }
}
