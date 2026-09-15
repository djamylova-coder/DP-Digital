import {getSession} from './auth'; import {NextResponse} from 'next/server';
export async function requireAdmin(){const s=await getSession();if(!s) return {session:null,response:NextResponse.json({message:'Non authentifié'},{status:401})};return {session:s,response:null};}
