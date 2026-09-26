-- Ajoute le nom et le code client interne (identifiant de suivi non secret)
-- sur les comptes utilisateur créés par auto-inscription.
ALTER TABLE "Compte" ADD COLUMN "nom" TEXT;
ALTER TABLE "Compte" ADD COLUMN "codeClient" TEXT;
CREATE UNIQUE INDEX "Compte_codeClient_key" ON "Compte"("codeClient");
