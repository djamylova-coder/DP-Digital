# Déploiement direct Netlify — DP Digital

Le projet est préparé pour être téléversé directement dans Netlify Drop. Netlify peut détecter un projet Next.js lorsque l'utilisateur est connecté et lancer le build avant publication.

## À faire dans Netlify
1. Ouvrir Netlify et se connecter au bon compte.
2. Ouvrir le déploiement par glisser-déposer.
3. Décompresser le ZIP si l'interface demande un dossier, ou déposer le ZIP dans l'interface qui accepte les ZIP.
4. Déposer le dossier racine `dp-digital-site`.
5. Netlify détecte Next.js et utilise le build configuré dans `netlify.toml`.

## Variables d'environnement à configurer AVANT la production
- DATABASE_URL
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY
- FIREBASE_DATABASE_URL
- WAVE_WEBHOOK_SECRET
- COMMAND_DATA_ENCRYPTION_KEY
- BACKUP_CRON_SECRET
- LOGIN_RATE_LIMIT_MAX (optionnel)
- LOGIN_RATE_LIMIT_WINDOW_MINUTES (optionnel)

`ADMIN_INITIAL_CODE` n'est nécessaire que pour l'initialisation/seed du premier compte et ne doit pas rester inutilement configuré ensuite.

## Important
Aucune clé JSON Firebase réelle n'est incluse dans cette archive. Les champs de la clé de service sont injectés dans les variables serveur Netlify. `FIREBASE_PRIVATE_KEY` doit conserver les retours à la ligne sous forme `\\n` si Netlify les stocke ainsi.

## Base Neon
Avant le premier trafic réel, appliquer les migrations Prisma et exécuter le seed du catalogue sur la base Neon de production.

## Limite de cette archive
Les dépendances npm n'ont pas été installées localement dans l'environnement de préparation : le build final n'a donc pas pu être exécuté ici. Le projet contient toutefois `package.json`, `netlify.toml`, Prisma et les fonctions nécessaires pour que Netlify installe les dépendances et exécute le build.
