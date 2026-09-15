import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
export function middleware(req:NextRequest){
 const protectedPath=req.nextUrl.pathname.startsWith('/dashboard')||req.nextUrl.pathname.startsWith('/catalogue');
 if(protectedPath&&!req.cookies.has('dp_admin_session')) return NextResponse.redirect(new URL('/connexion',req.url));
 return NextResponse.next();
}
export const config={matcher:['/dashboard/:path*','/catalogue/:path*']};
