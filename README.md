# DP Digital — Site administrateur

Site administrateur DP Digital : Next.js App Router + TypeScript + Prisma/PostgreSQL Neon + Netlify.

## Pages
- `/connexion`
- `/dashboard`
- `/catalogue`

Le dashboard reste une page unique scrollable. Le catalogue est la source unique de vérité. Firebase RTDB est utilisé uniquement comme canal site → serveurs.

## Étapes réalisées
- Étape 1 : moteur d'exécution USSD, machine d'état, UNKNOWN et leases.
- Étape 2 : contraintes Prisma, idempotence et préparation Netlify.
- Étape 3 : authentification API des appareils et signature Wave.
- Étapes 4–6 : catalogue complet, Firebase Admin/RTDB, file par appareil, chiffrement du numéro, audit, sauvegardes Netlify Blobs, rate limiting de connexion et contrôles de sécurité production.

## Déploiement
Voir `NETLIFY-TELEVERSEMENT-DIRECT.md`.

## Secrets
Ne jamais committer `.env`, clé JSON Firebase, clé privée ou codes réels. Utiliser les variables d'environnement Netlify. Le plan projet demande également la rotation des secrets qui ont été présents dans les documents de conception.

## Architecture finale — rôle de Firebase
Firebase Realtime Database est uniquement le canal temps réel entre le backend DP Digital et l'application Serveur. La logique métier, les états de commande, le rapprochement Wave, la validation et la décision finale restent dans le backend.
