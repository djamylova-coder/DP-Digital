-- Initial DP Digital schema.
CREATE TYPE "Famille" AS ENUM ('administrateur', 'utilisateur', 'serveur');
CREATE TYPE "StatutAppareil" AS ENUM ('disponible', 'occupe', 'hors_ligne');
CREATE TYPE "StatutVerification" AS ENUM ('verifie', 'a_tester');
CREATE TYPE "EtatCommande" AS ENUM ('attente_paiement', 'attente_ussd', 'en_cours', 'termine', 'echec', 'traitement_manuel');
CREATE TYPE "ResultatExecution" AS ENUM ('success', 'failure', 'unknown');
CREATE TYPE "DecisionManuelle" AS ENUM ('EXECUTED_MANUALLY', 'REFUNDED');

CREATE TABLE "Compte" (
  "id" TEXT NOT NULL,
  "famille" "Famille" NOT NULL,
  "codeHache" TEXT NOT NULL,
  "actif" BOOLEAN NOT NULL DEFAULT true,
  "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dateDerniereConnexion" TIMESTAMP(3),
  CONSTRAINT "Compte_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "compteId" TEXT NOT NULL,
  "jeton" TEXT NOT NULL,
  "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dateExpiration" TIMESTAMP(3) NOT NULL,
  "dateRevocation" TIMESTAMP(3),
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_jeton_key" ON "Session"("jeton");
CREATE INDEX "Session_compteId_dateExpiration_dateRevocation_idx" ON "Session"("compteId","dateExpiration","dateRevocation");

CREATE TABLE "Appareil" (
  "id" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "operateur" TEXT NOT NULL,
  "statut" "StatutAppareil" NOT NULL DEFAULT 'hors_ligne',
  "derniereActivite" TIMESTAMP(3),
  "secretHache" TEXT,
  "actif" BOOLEAN NOT NULL DEFAULT true,
  "compteId" TEXT,
  CONSTRAINT "Appareil_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Appareil_secretHache_key" ON "Appareil"("secretHache");
CREATE INDEX "Appareil_operateur_statut_idx" ON "Appareil"("operateur","statut");

CREATE TABLE "MarchandWave" (
  "id" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "actif" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "MarchandWave_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarchandWave_reference_key" ON "MarchandWave"("reference");

CREATE TABLE "Forfait" (
  "id" TEXT NOT NULL,
  "operateur" TEXT NOT NULL,
  "categorie" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "prixFcfa" INTEGER NOT NULL,
  "validite" TEXT,
  "typeSyntaxe" TEXT NOT NULL,
  "syntaxe" TEXT NOT NULL,
  "statutVerification" "StatutVerification" NOT NULL DEFAULT 'a_tester',
  "actif" BOOLEAN NOT NULL DEFAULT true,
  "dateModification" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Forfait_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Forfait_operateur_categorie_nom_prixFcfa_key" ON "Forfait"("operateur","categorie","nom","prixFcfa");
CREATE INDEX "Forfait_operateur_categorie_actif_idx" ON "Forfait"("operateur","categorie","actif");

CREATE TABLE "Commande" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "cleIdempotence" TEXT NOT NULL,
  "operateur" TEXT NOT NULL,
  "numeroMasque" TEXT NOT NULL,
  "numeroChiffre" TEXT,
  "forfaitId" TEXT NOT NULL,
  "montantFcfa" INTEGER NOT NULL,
  "etat" "EtatCommande" NOT NULL DEFAULT 'attente_paiement',
  "failureCode" TEXT,
  "resultatUssd" TEXT,
  "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dateExecution" TIMESTAMP(3),
  "dateDerniereMaj" TIMESTAMP(3) NOT NULL,
  "resultatExecution" "ResultatExecution",
  "decisionManuelle" "DecisionManuelle",
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "verificationAttemptCount" INTEGER NOT NULL DEFAULT 0,
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "executionStartedAt" TIMESTAMP(3),
  "compteId" TEXT,
  "appareilId" TEXT,
  CONSTRAINT "Commande_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationWave" (
  "id" TEXT NOT NULL,
  "identifiantExterne" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "montantFcfa" INTEGER NOT NULL,
  "dateReception" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rapprochee" BOOLEAN NOT NULL DEFAULT false,
  "commandeId" TEXT,
  "marchandId" TEXT,
  CONSTRAINT "NotificationWave_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationWave_identifiantExterne_key" ON "NotificationWave"("identifiantExterne");
CREATE INDEX "NotificationWave_rapprochee_dateReception_idx" ON "NotificationWave"("rapprochee","dateReception");

CREATE UNIQUE INDEX "Commande_reference_key" ON "Commande"("reference");
CREATE UNIQUE INDEX "Commande_cleIdempotence_key" ON "Commande"("cleIdempotence");
CREATE UNIQUE INDEX "Commande_leaseToken_key" ON "Commande"("leaseToken");
CREATE INDEX "Commande_etat_dateCreation_idx" ON "Commande"("etat","dateCreation");
CREATE INDEX "Commande_appareilId_etat_idx" ON "Commande"("appareilId","etat");
CREATE INDEX "Commande_appareilId_leaseExpiresAt_idx" ON "Commande"("appareilId","leaseExpiresAt");
CREATE INDEX "Commande_etat_resultatExecution_idx" ON "Commande"("etat","resultatExecution");

CREATE TABLE "AuthRateLimit" (
  "id" TEXT NOT NULL,
  "cle" TEXT NOT NULL,
  "fenetreDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tentatives" INTEGER NOT NULL DEFAULT 0,
  "bloqueJusqu" TIMESTAMP(3),
  CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AuthRateLimit_cle_key" ON "AuthRateLimit"("cle");
CREATE INDEX "AuthRateLimit_bloqueJusqu_idx" ON "AuthRateLimit"("bloqueJusqu");

CREATE TABLE "BackupRun" (
  "id" TEXT NOT NULL,
  "statut" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dateFin" TIMESTAMP(3),
  "details" TEXT,
  CONSTRAINT "BackupRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BackupRun_dateDebut_idx" ON "BackupRun"("dateDebut");

CREATE TABLE "Audit" (
  "id" TEXT NOT NULL,
  "compteId" TEXT,
  "commandeId" TEXT,
  "action" TEXT NOT NULL,
  "details" TEXT,
  "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Audit_dateCreation_idx" ON "Audit"("dateCreation");

ALTER TABLE "Session" ADD CONSTRAINT "Session_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appareil" ADD CONSTRAINT "Appareil_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_forfaitId_fkey" FOREIGN KEY ("forfaitId") REFERENCES "Forfait"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_appareilId_fkey" FOREIGN KEY ("appareilId") REFERENCES "Appareil"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationWave" ADD CONSTRAINT "NotificationWave_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationWave" ADD CONSTRAINT "NotificationWave_marchandId_fkey" FOREIGN KEY ("marchandId") REFERENCES "MarchandWave"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;
