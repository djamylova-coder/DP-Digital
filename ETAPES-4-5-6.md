# DP Digital — Étapes 4, 5 et 6

## Étape 4 — Catalogue et canal Firebase
- Catalogue conservé comme source unique de vérité.
- API GET/POST/PATCH des forfaits.
- Validation des modifications et audit.
- Firebase Admin SDK ajouté côté serveur uniquement.
- Canal RTDB site → serveurs : `dp-digital/commands/{deviceId}/{commandId}`.
- Une commande payée et rapprochée peut être publiée vers le téléphone-serveur lors de sa prise en charge.

## Étape 5 — Comportements transversaux
- Machine d'état et lease d'exécution.
- Une seule commande active par appareil.
- Idempotence des commandes et notifications Wave.
- File de commandes par appareil.
- Audit des créations, exécutions, rapprochements et clôtures manuelles.
- Journal des sauvegardes et fonction planifiée quotidienne.

## Étape 6 — Sécurité avant production
- Rate limiting DB sur la connexion admin.
- Session admin unique conservée.
- Secrets appareil hashés.
- API appareil authentifiées.
- Webhook Wave signé HMAC.
- Firebase privé côté serveur.
- Aucun secret dans `NEXT_PUBLIC_*`.
- `.env` exclu du dépôt.

## Variables Netlify
Configurer au minimum :
`DATABASE_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL`, `WAVE_WEBHOOK_SECRET`, `BACKUP_CRON_SECRET`, `ADMIN_INITIAL_CODE` uniquement pendant le seed initial.

La clé Firebase JSON complète ne doit pas être déposée dans le dépôt. Seuls ses champs serveur nécessaires sont placés dans les variables Netlify.
