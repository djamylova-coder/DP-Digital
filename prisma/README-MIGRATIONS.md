# Migrations Prisma — Étape 2

Cette étape ajoute les contraintes de persistance nécessaires avant le branchement réel de Neon :

- clé d'idempotence unique sur les commandes ;
- identifiant externe unique sur les notifications Wave ;
- secret d'appareil stocké uniquement sous forme hachée ;
- activation/désactivation explicite d'un appareil.

## Première mise en production

Configurer `DATABASE_URL`, puis exécuter :

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Le seed doit être idempotent : il peut être relancé sans créer plusieurs fois le catalogue.

## Netlify

Le fichier `netlify.toml` reste la configuration de build. Le projet contient `netlify.toml` avec `npm run build` et le plugin Next.js. Lors d'un déploiement Netlify Drop effectué depuis un compte connecté, Netlify peut détecter le projet Next.js et installer les dépendances puis exécuter le build.

Pour une première mise en production, il faut néanmoins vérifier dans l'interface Netlify que le build a bien réussi avant d'ouvrir le trafic réel.
