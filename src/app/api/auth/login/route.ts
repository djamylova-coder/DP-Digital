import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { newToken, SESSION_COOKIE } from '@/lib/auth';
import { checkLoginRateLimit, clearLoginRateLimit, registerLoginFailure } from '@/lib/rate-limit';

function clientKey(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return `login:${forwarded || 'unknown'}`;
}

export async function POST(req: Request) {
  try {
    const key = clientKey(req);
    const limit = await checkLoginRateLimit(key);
    if (!limit.allowed) return NextResponse.json({ message: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    const { code } = await req.json();
    if (typeof code !== 'string' || !code) { await registerLoginFailure(key); return NextResponse.json({ message: 'Accès refusé' }, { status: 401 }); }
    const result = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('dp-digital-admin-login'))`;
      const admin = await tx.compte.findFirst({ where: { famille: 'administrateur' } });
      if (!admin || !admin.actif || !(await bcrypt.compare(code, admin.codeHache))) return { kind: 'bad' as const };
      // Règle "un seul admin connecté à la fois" désactivée : plusieurs sessions
      // admin actives peuvent désormais coexister pour ce compte.
      const token = newToken(); const expires = new Date(Date.now() + 12 * 60 * 60 * 1000);
      await tx.session.create({ data: { compteId: admin.id, jeton: token, dateExpiration: expires } });
      await tx.compte.update({ where: { id: admin.id }, data: { dateDerniereConnexion: new Date() } });
      return { kind: 'ok' as const, token, expires };
    });
    if (result.kind === 'bad') { await registerLoginFailure(key); return NextResponse.json({ message: 'Accès refusé' }, { status: 401 }); }
    if (result.kind === 'active') return NextResponse.json({ message: 'Administrateur déjà connecté' }, { status: 409 });
    await clearLoginRateLimit(key);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, result.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', expires: result.expires, path: '/' });
    return res;
  } catch (e) { console.error(e); return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 }); }
}
