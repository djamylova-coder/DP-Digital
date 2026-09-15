import {redirect} from 'next/navigation';import {getSession} from '@/lib/auth';import CatalogueClient from './ui';
export default async function Catalogue(){if(!(await getSession()))redirect('/connexion');return <CatalogueClient/>}
