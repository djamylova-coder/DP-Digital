# Checklist production DP Digital

- [ ] Créer/configurer Neon PostgreSQL.
- [ ] Ajouter toutes les variables Netlify (ne jamais committer `.env`).
- [ ] Générer une nouvelle `COMMAND_DATA_ENCRYPTION_KEY` de 32 octets en base64.
- [ ] Régénérer les secrets Firebase/Wave/backup avant production.
- [ ] `npx prisma migrate deploy`.
- [ ] `npm run db:seed` (ou procédure équivalente de seed sur l'environnement).
- [ ] Vérifier les 134 forfaits du catalogue.
- [ ] Tester deux connexions admin simultanées : la seconde doit recevoir `Administrateur déjà connecté`.
- [ ] Tester heartbeat appareil.
- [ ] Tester création → paiement → attente_ussd → exécution → succès/échec/UNKNOWN.
- [ ] Tester clôture manuelle.
- [ ] Tester webhook Wave avec signature valide et invalide.
- [ ] Vérifier qu'aucun secret et aucun numéro bénéficiaire en clair n'apparaît dans l'UI/logs publics.
- [ ] Vérifier la sauvegarde et la restauration de procédure avant branchement des téléphones réels.
