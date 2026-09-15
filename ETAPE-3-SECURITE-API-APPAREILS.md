# Étape 3 — Sécurité API appareils / USSD / Wave

## Fait
- Heartbeat appareil protégé par Bearer token individuel.
- Endpoint de résultat USSD protégé par le secret de l'appareil affecté.
- Rotation de secret par l'administrateur : `POST /api/appareils/:id/credentials`.
- Secret généré aléatoirement, stocké uniquement sous forme SHA-256.
- Signature HMAC SHA-256 pour le webhook Wave via `WAVE_WEBHOOK_SECRET`.
- Idempotence Wave conservée avec `identifiantExterne` unique.
- Suppression du rapprochement dangereux « même montant + plus ancienne commande » : seule une référence exacte et un montant correspondant sont rapprochés automatiquement.
- Toutes les actions sensibles doivent rester côté serveur.

## Provisionnement d'un appareil
1. Se connecter comme administrateur.
2. Appeler `POST /api/appareils/:id/credentials`.
3. Le secret retourné n'est affiché qu'à cette opération.
4. Le serveur/appareil utilise ensuite `Authorization: Bearer <secret>`.
5. Ne jamais mettre ce secret dans `NEXT_PUBLIC_*` ni dans le dépôt Git.

## Netlify
Variables à configurer dans Netlify :
- `DATABASE_URL`
- `ADMIN_INITIAL_CODE` uniquement lors du premier seed, puis à supprimer/faire tourner.
- `WAVE_WEBHOOK_SECRET`
- autres secrets serveur nécessaires au projet.

Le site reste déployable via le build Next.js défini dans `netlify.toml`.
