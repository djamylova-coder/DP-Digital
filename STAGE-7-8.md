# DP Digital — Étapes 7 et 8

## Étape 7 — Validation finale
- Dashboard unique et scrollable avec les 7 blocs du plan : résumé, appareils, commandes, comptes, traitement manuel, Wave, maintenance/sauvegardes.
- Polling front toutes les 15 secondes.
- Aucun numéro bénéficiaire en clair dans le dashboard : affichage du numéro masqué.
- Actions de traitement manuel : `EXECUTED_MANUALLY` ou `REFUNDED`.
- Gestion d'activation/désactivation des comptes depuis le dashboard.
- Règle d'un seul administrateur conservée par l'API d'authentification.
- Catalogue reste la source de vérité des forfaits.
- Les secrets restent hors du dépôt et hors de l'interface.

## Étape 8 — Déploiement
1. Téléverser ce ZIP dans Netlify Drop en étant connecté à Netlify.
2. Configurer les variables d'environnement de production à partir de `.env.example`.
3. Renseigner `DATABASE_URL` vers Neon et exécuter les migrations Prisma puis le seed du catalogue.
4. Configurer Firebase Admin, la clé de chiffrement des numéros, le secret Wave et le secret de backup.
5. Vérifier les smoke tests : connexion, dashboard, heartbeat, remontée résultat USSD, notification Wave, clôture manuelle.
6. Brancher les vrais appareils seulement après ces tests.

## Limite actuelle
La validation de compilation complète n'a pas été exécutée dans cet environnement car les dépendances npm n'étaient pas installées localement. Le ZIP est donc livré comme source de déploiement, avec validation structurelle et revue des routes effectuées, mais il faut laisser Netlify exécuter `npm run build` avant la mise en production.
