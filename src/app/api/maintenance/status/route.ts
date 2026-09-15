import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
export async function GET() { const a = await requireAdmin(); if (a.response) return a.response; const last = await prisma.backupRun.findFirst({ orderBy: { dateDebut: 'desc' } }); return NextResponse.json({ etat: 'ok', sauvegarde: { derniere: last?.dateFin ?? null, statut: last?.statut ?? 'jamais_executee', prochaine: null }, message: 'La sauvegarde physique PostgreSQL reste gérée par Neon; ce journal suit son contrôle côté DP Digital.' }); }
