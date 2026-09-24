-- Une seule commande active (attente_paiement / attente_ussd / en_cours) par serveur (appareil).
-- Garantie au niveau de la base : deux clients simultanés ne peuvent plus obtenir
-- chacun une commande active sur le même serveur, même si les deux passent le contrôle « occupé ».
CREATE UNIQUE INDEX IF NOT EXISTS "Commande_un_seul_actif_par_appareil"
ON "Commande" ("appareilId")
WHERE "appareilId" IS NOT NULL
  AND "etat" IN ('attente_paiement', 'attente_ussd', 'en_cours');
