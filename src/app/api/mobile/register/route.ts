import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { newToken } from '@/lib/auth';

const ALPHABET_CODE = '123456789ABCDEFGHIJKLMN';

function genererCodeClient(): string {
  let code = '#';
  for (let i = 0; i < 5; i++) {
    code += ALPHABET_CODE[Math.floor(Math.random() * ALPHABET_CODE.length)];
  }
  return code;
}

async function codeClientUnique(): Promise<string> {
  for (let tentative = 0; tentative < 25; tentative++) {
    const candidat = genererCodeClient();
    const existant = await prisma.compte.findUnique({ where: { codeClient: candidat } });
    if (!existant) return candidat;
  }
  // Fallback extrêmement improbable : on ajoute un suffixe temporel pour garantir l'unicité.
  return `${genererCodeClient()}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const nom = String(body.nom ?? '').trim();
    const numero = String(body.numero ?? '').trim();
    if (!nom || !numero) {
      return NextResponse.json({ message: 'Nom et numéro requis.' }, { status: 400 });
    }

    const expires = new Date('2099-12-31T23:59:59.999Z');
    const existant = await prisma.compte.findFirst({ where: { id: numero, famille: 'utilisateur' } });

    if (existant) {
      if (!existant.actif) {
        return NextResponse.json({ message: 'Ce compte a été désactivé. Contactez le support.' }, { status: 403 });
      }
      const token = newToken();
      await prisma.$transaction(async (tx) => {
        // Pas de révocation des sessions existantes : le client peut être connecté
        // sur plusieurs appareils en même temps.
        await tx.session.create({ data: { compteId: existant.id, jeton: token, dateExpiration: expires } });
        await tx.compte.update({ where: { id: existant.id }, data: { nom, dateDerniereConnexion: new Date() } });
      });
      return NextResponse.json({ ok: true, sessionToken: token });
    }

    const codeClient = await codeClientUnique();
    const codeHache = await bcrypt.hash(codeClient, 12);
    const token = newToken();
    const compte = await prisma.$transaction(async (tx) => {
      const c = await tx.compte.create({
        data: { id: numero, famille: 'utilisateur', nom, codeClient, codeHache },
      });
      await tx.session.create({ data: { compteId: c.id, jeton: token, dateExpiration: expires } });
      return c;
    });
    return NextResponse.json({ ok: true, sessionToken: token, id: compte.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: 'Erreur serveur.' }, { status: 500 });
  }
}
