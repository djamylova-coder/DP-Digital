-- À exécuter UNE FOIS dans Neon > SQL Editor (base de production).
-- Étape 1 : vérifier qu'aucun serveur n'a déjà plusieurs commandes actives.
-- Cette requête doit retourner 0 ligne. Sinon, terminer ou annuler les commandes en trop avant l'étape 2.
SELECT "appareilId", count(*) AS commandes_actives
FROM "Commande"
WHERE "appareilId" IS NOT NULL
  AND "etat" IN ('attente_paiement', 'attente_ussd', 'en_cours')
GROUP BY "appareilId"
HAVING count(*) > 1;

-- Étape 2 : créer la règle (sans effet si elle existe déjà).
CREATE UNIQUE INDEX IF NOT EXISTS "Commande_un_seul_actif_par_appareil"
ON "Commande" ("appareilId")
WHERE "appareilId" IS NOT NULL
  AND "etat" IN ('attente_paiement', 'attente_ussd', 'en_cours');
