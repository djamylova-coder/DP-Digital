import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';

function safeEqualHex(a: string, b: string) {
  const aa = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export async function requireDevice(req: Request, deviceId: string) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return { device: null, response: NextResponse.json({ message: 'Authentification appareil requise' }, { status: 401 }) };

  const device = await prisma.appareil.findUnique({ where: { id: deviceId }, include: { compte: true } });
  if (!device || !device.actif) {
    return { device: null, response: NextResponse.json({ message: 'Appareil non autorisé' }, { status: 401 }) };
  }

  // Dedicated server sessions are also accepted. This is the authentication
  // established by /api/mobile/access and is revoked from the admin side.
  if (device.compte?.famille === 'serveur') {
    const session = await prisma.session.findUnique({ where: { jeton: token }, include: { compte: true } });
    if (session && session.compteId === device.compteId && !session.dateRevocation && session.dateExpiration > new Date() && session.compte.actif) {
      return { device, response: null };
    }
  }

  if (!device.secretHache) {
    return { device: null, response: NextResponse.json({ message: 'Authentification appareil invalide' }, { status: 401 }) };
  }
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  if (!safeEqualHex(hash, device.secretHache)) {
    return { device: null, response: NextResponse.json({ message: 'Authentification appareil invalide' }, { status: 401 }) };
  }
  return { device, response: null };
}

export function newDeviceSecret() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashDeviceSecret(secret: string) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}
