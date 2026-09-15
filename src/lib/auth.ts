import { cookies } from 'next/headers';
import { prisma } from './prisma';
import crypto from 'node:crypto';
export const SESSION_COOKIE='dp_admin_session';
export async function getSession(){
  const token=(await cookies()).get(SESSION_COOKIE)?.value;
  if(!token) return null;
  const session=await prisma.session.findUnique({where:{jeton:token},include:{compte:true}});
  if(!session || session.dateRevocation || session.dateExpiration <= new Date() || session.compte.famille!=='administrateur' || !session.compte.actif) return null;
  return session;
}
export function newToken(){return crypto.randomBytes(32).toString('hex')}
