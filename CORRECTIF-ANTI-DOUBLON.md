# Correctif — une seule commande active par serveur

Problème : deux clients simultanés sur le même opérateur pouvaient chacun créer une commande en attente sur le même serveur, car le contrôle « opérateur occupé » et la création de commande étaient deux étapes séparées.

Correctif :
- `prisma/migrations/20260924000000_one_active_command_per_device/migration.sql` : index unique partiel en base (une seule commande en `attente_paiement`, `attente_ussd` ou `en_cours` par appareil).
- `src/app/api/mobile/commandes/route.ts` : en cas de conflit, réponse `409 Opérateur actuellement occupé` (ou renvoi de la commande existante si la clé d'idempotence est rejouée).
- `src/app/api/commandes/route.ts` : réponse `409` au lieu d'une erreur 500.
- `scripts/setup-db.mjs` : applique aussi la règle pour une base neuve.
- `prisma/manual/anti-doublon-commandes.sql` : version à coller dans Neon > SQL Editor pour une base existante.

Netlify ne lance PAS les migrations : la règle doit être appliquée à la base (Neon) séparément.
