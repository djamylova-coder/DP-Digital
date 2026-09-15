import {redirect} from 'next/navigation'; import {getSession} from '@/lib/auth'; import DashboardClient from './ui';
export default async function Dashboard(){if(!(await getSession()))redirect('/connexion');return <DashboardClient/>}
