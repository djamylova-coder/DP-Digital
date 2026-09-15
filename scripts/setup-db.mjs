// Script de secours : crée les tables + insère les données de départ
// SANS passer par le moteur Prisma (qui plante sur Termux/Android).
// Utilise uniquement des paquets purement JS (pg, bcryptjs) + le fichier
// de migration SQL déjà présent dans prisma/migrations.
//
// Usage :
//   npm install pg dotenv
//   node scripts/setup-db.mjs

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL / DIRECT_URL manquant dans .env');
  process.exit(1);
}

const client = new pg.Client({ connectionString });

function pick(o, ...keys) {
  for (const k of keys) if (o?.[k] !== undefined) return o[k];
  return undefined;
}

async function main() {
  await client.connect();
  console.log('✔ Connecté à la base');

  // 1. Vérifie si les tables existent déjà (évite de rejouer la migration)
  const check = await client.query(
    `SELECT to_regclass('"Compte"') AS exists`
  );
  const alreadyMigrated = check.rows[0].exists !== null;

  if (!alreadyMigrated) {
    console.log('→ Application de la migration SQL initiale...');
    const migrationPath = join(
      root,
      'prisma/migrations/20260914000000_init/migration.sql'
    );
    const sql = readFileSync(migrationPath, 'utf8');
    await client.query(sql);
    console.log('✔ Tables créées');
  } else {
    console.log('✔ Tables déjà présentes, migration ignorée');
  }

  // 2. Compte admin
  const adminCode = process.env.ADMIN_INITIAL_CODE;
  if (adminCode) {
    const hash = bcrypt.hashSync(adminCode, 12);
    await client.query(
      `INSERT INTO "Compte" (id, famille, "codeHache", actif)
       VALUES ('admin-dp-digital', 'administrateur', $1, true)
       ON CONFLICT (id) DO UPDATE SET "codeHache" = $1, actif = true`,
      [hash]
    );
    console.log('✔ Compte admin créé/mis à jour');
  } else {
    console.log('⚠ ADMIN_INITIAL_CODE absent du .env, compte admin ignoré');
  }

  // 3. Catalogue de forfaits
  const catalogueRaw = JSON.parse(
    readFileSync(join(root, 'prisma/catalogue.json'), 'utf8')
  );
  const items = Array.isArray(catalogueRaw)
    ? catalogueRaw
    : catalogueRaw.forfaits ?? catalogueRaw.catalogue ?? [];

  let count = 0;
  for (const x of items) {
    const operateur = String(pick(x, 'operateur', 'operator') ?? '').toLowerCase();
    const categorie = String(pick(x, 'categorie', 'category') ?? '');
    const nom = String(pick(x, 'nom', 'name') ?? '');
    const prix = Number(pick(x, 'prix_fcfa', 'prix', 'price') ?? 0);
    const validite = pick(x, 'validite', 'validity');
    const syntaxe = String(
      pick(x, 'syntaxe', 'syntax', 'ussd', 'syntaxe_simple') ?? ''
    );
    const typeSyntaxe = String(pick(x, 'type_syntaxe', 'typeSyntaxe') ?? '');
    if (!operateur || !nom) continue;
    const actif = !(operateur === 'mtn' && categorie.toLowerCase() === 'forfait internet');

    await client.query(
      `INSERT INTO "Forfait"
         (id, operateur, categorie, nom, "prixFcfa", validite, "typeSyntaxe", syntaxe, "statutVerification", actif, "dateModification")
       VALUES
         (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, 'a_tester', $8, CURRENT_TIMESTAMP)
       ON CONFLICT (operateur, categorie, nom, "prixFcfa")
       DO UPDATE SET validite = $5, "typeSyntaxe" = $6, syntaxe = $7, actif = $8, "dateModification" = CURRENT_TIMESTAMP`,
      [operateur, categorie, nom, prix, validite ? String(validite) : null, typeSyntaxe, syntaxe, actif]
    );
    count++;
  }
  console.log(`✔ ${count} forfaits insérés/mis à jour`);

  // 4. Appareils (serveurs USSD par opérateur)
  const appareils = [
    ['orange', 'Serveur Orange', 'orange'],
    ['moov', 'Serveur Moov', 'moov'],
    ['mtn', 'Serveur MTN', 'mtn'],
  ];
  for (const [id, nom, operateur] of appareils) {
    await client.query(
      `INSERT INTO "Appareil" (id, nom, operateur)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET nom = $2, operateur = $3`,
      [id, nom, operateur]
    );
  }
  console.log('✔ 3 appareils créés/mis à jour');

  await client.end();
  console.log('🎉 Terminé — la base de données est prête.');
}

main().catch((err) => {
  console.error('❌ Erreur :', err);
  process.exit(1);
});
