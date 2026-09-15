import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {requireAdmin} from '@/lib/api-auth';
export async function GET(){const a=await requireAdmin();if(a.response)return a.response;const [rows,revoques]=await Promise.all([prisma.compte.groupBy({by:['actif'],_count:true}),prisma.session.count({where:{dateRevocation:{not:null}}})]);return NextResponse.json({actifs:rows.find(x=>x.actif)?._count??0,desactives:rows.find(x=>!x.actif)?._count??0,revoques});}
