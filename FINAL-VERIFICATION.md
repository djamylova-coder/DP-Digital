# DP Digital — vérification finale étapes 1 à 8

## Corrections effectuées lors de la dernière revue

- Ajout d'une migration Prisma initiale complète : une nouvelle base Neon n'essaie plus d'appliquer des `ALTER TABLE` sur des tables inexistantes.
- Ajout de `migration_lock.toml` pour PostgreSQL.
- Conservation de la compatibilité avec l'historique des migrations déjà prévu.
- Un résultat USSD ne peut plus être accepté avec un lease d'exécution expiré.
- Un heartbeat appareil ne peut plus repasser l'appareil en `disponible` lorsqu'une commande active possède encore un lease valide.
- Documentation Netlify corrigée pour le déploiement du projet Next.js par Netlify Drop depuis un compte connecté.
- Recherche de secrets accidentellement embarqués dans le projet : aucune clé privée Firebase ou secret de production n'est inclus dans l'archive.

## Couverture des étapes

- Étapes 1–3 : socle Next.js/Prisma, connexion administrateur, API et sécurité.
- Étapes 4–6 : catalogue, moteur d'exécution, Firebase, Wave, chiffrement du numéro, rate limiting, audit et sauvegardes.
- Étape 7 : dashboard complet en 7 blocs et checklist de validation.
- Étape 8 : configuration Netlify, migrations/seed et procédure de mise en production.

## Point de vérité sur les tests

Une installation complète des dépendances npm a été tentée dans l'environnement de préparation mais n'a pas terminé dans le délai disponible. Par conséquent, ce dossier n'affirme pas qu'un `next build` local a été exécuté avec succès.

La validation finale de compilation doit donc être faite par Netlify lors du premier déploiement. Tant que ce build n'est pas vert, ne pas brancher les téléphones ni ouvrir le trafic réel.

## Secrets à fournir uniquement dans Netlify

`DATABASE_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL`, `WAVE_WEBHOOK_SECRET`, `COMMAND_DATA_ENCRYPTION_KEY`, `BACKUP_CRON_SECRET` et, pour l'initialisation, `ADMIN_INITIAL_CODE`.

Le fichier `.env.example` contient uniquement les noms de variables et des valeurs d'exemple.
