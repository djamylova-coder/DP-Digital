import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function validSignature(req: Request, raw: string) {
  const secret = process.env.WAVE_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const supplied = req.headers.get('x-wave-signature') ?? '';
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return supplied.length === expected.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(req, raw)) return NextResponse.json({ message: 'Signature invalide' }, { status: 401 });
  let body: any;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ message: 'JSON invalide' }, { status: 400 }); }
  const externalId = String(body.identifiant_externe ?? body.id ?? '');
  const reference = String(body.reference ?? '');
  const montant = Number(body.montant_fcfa);
  if (!externalId || !reference || !Number.isFinite(montant) || montant <= 0) return NextResponse.json({ message: 'Payload invalide' }, { status: 400 });

  const existing = await prisma.notificationWave.findUnique({ where: { identifiantExterne: externalId } });
  if (existing) return NextResponse.json({ ok: true, duplicate: true, notificationId: existing.id, rapprochee: existing.rapprochee });

  // Exact reference only. Ambiguous amount-only matching is deliberately forbidden.
  const exact = await prisma.commande.findUnique({ where: { reference } });
  const match = exact && exact.montantFcfa === montant && exact.etat === 'attente_paiement' ? exact : null;
  const n = await prisma.$transaction(async tx => {
    const created = await tx.notificationWave.create({ data: { identifiantExterne: externalId, reference, montantFcfa: montant, rapprochee: !!match, commandeId: match?.id } });
    if (match) {
      await tx.commande.update({ where: { id: match.id }, data: { etat: 'attente_ussd' } });
      await tx.audit.create({ data: { commandeId: match.id, action: 'WAVE_RECONCILIATION', details: JSON.stringify({ notificationId: created.id, reference }) } });
    }
    return created;
  });
  return NextResponse.json({ ok: true, duplicate: false, rapprochee: !!match, notificationId: n.id });
}
