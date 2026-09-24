import { PrismaClient, Famille, StatutVerification } from '@prisma/client';
import bcrypt from 'bcryptjs';
import catalogue from './catalogue.json';

const prisma = new PrismaClient();
function pick(o:any,...keys:string[]){for(const k of keys) if(o?.[k]!==undefined) return o[k]; return undefined}

async function main(){
  const adminCode = process.env.ADMIN_INITIAL_CODE;
  if (adminCode) {
    const hash = await bcrypt.hash(adminCode, 12);
    await prisma.compte.upsert({
      where:{id:'admin-dp-digital'},
      update:{codeHache:hash,actif:true},
      create:{id:'admin-dp-digital',famille:Famille.administrateur,codeHache:hash}
    });
  }

  const items = Array.isArray(catalogue) ? catalogue : (catalogue as any).forfaits ?? (catalogue as any).catalogue ?? [];
  for (const x of items) {
    const operateur = String(pick(x,'operateur','operator') ?? '').toLowerCase();
    const categorie = String(pick(x,'categorie','category') ?? '');
    const nom = String(pick(x,'nom','name') ?? '');
    const prix = Number(pick(x,'prix_fcfa','prix','price') ?? 0);
    const validite = pick(x,'validite','validity');
    const syntaxe = String(pick(x,'syntaxe','syntax','ussd') ?? '');
    const typeSyntaxe = String(pick(x,'type_syntaxe','typeSyntaxe') ?? '');
    if (!operateur || !nom) continue;
    const actif = !(operateur === 'mtn' && categorie.toLowerCase() === 'forfait internet');
    await prisma.forfait.upsert({
      where:{operateur_categorie_nom_prixFcfa:{operateur,categorie,nom,prixFcfa:prix}},
      update:{validite:validite ? String(validite):null,typeSyntaxe,syntaxe,statutVerification:StatutVerification.a_tester,actif},
      create:{operateur,categorie,nom,prixFcfa:prix,validite:validite?String(validite):null,typeSyntaxe,syntaxe,statutVerification:StatutVerification.a_tester,actif}
    });
  }

  const serverConfigs = [
    ['orange','Serveur Orange','SERVER_ORANGE_CODE'],
    ['moov','Serveur Moov','SERVER_MOOV_CODE'],
    ['mtn','Serveur MTN','SERVER_MTN_CODE'],
  ] as const;
  for (const [id, nom, envName] of serverConfigs) {
    const operateur = id;
    const code = process.env[envName];
    if (!code) { console.warn(`${envName} absent : compte serveur ${operateur} non initialisé.`); continue; }
    const compteId = `server-${operateur}`;
    const hash = await bcrypt.hash(code, 12);
    const compte = await prisma.compte.upsert({
      where: { id: compteId },
      update: { codeHache: hash, famille: Famille.serveur, actif: true },
      create: { id: compteId, famille: Famille.serveur, codeHache: hash },
    });
    await prisma.appareil.upsert({
      where: { id },
      update: { nom, operateur, compteId: compte.id, actif: true },
      create: { id, nom, operateur, compteId: compte.id },
    });
  }
}

main().catch(err=>{console.error(err);process.exitCode=1}).finally(()=>prisma.$disconnect());
