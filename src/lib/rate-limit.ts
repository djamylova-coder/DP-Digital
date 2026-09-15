import { prisma } from '@/lib/prisma';

export async function checkLoginRateLimit(key: string) {
  const max = Math.max(1, Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 8));
  const windowMs = Math.max(1, Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES ?? 15)) * 60_000;
  const now = new Date();
  const row = await prisma.authRateLimit.findUnique({ where: { cle: key } });
  if (!row || now.getTime() - row.fenetreDebut.getTime() >= windowMs) {
    await prisma.authRateLimit.upsert({ where: { cle: key }, create: { cle: key, fenetreDebut: now, tentatives: 0 }, update: { fenetreDebut: now, tentatives: 0, bloqueJusqu: null } });
    return { allowed: true, retryAfter: 0 };
  }
  if (row.bloqueJusqu && row.bloqueJusqu > now) return { allowed: false, retryAfter: Math.ceil((row.bloqueJusqu.getTime() - now.getTime()) / 1000) };
  if (row.tentatives >= max) {
    const until = new Date(now.getTime() + windowMs);
    await prisma.authRateLimit.update({ where: { cle: key }, data: { bloqueJusqu: until } });
    return { allowed: false, retryAfter: Math.ceil(windowMs / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

export async function registerLoginFailure(key: string) {
  await prisma.authRateLimit.updateMany({ where: { cle: key }, data: { tentatives: { increment: 1 } } });
}

export async function clearLoginRateLimit(key: string) {
  await prisma.authRateLimit.deleteMany({ where: { cle: key } });
}
