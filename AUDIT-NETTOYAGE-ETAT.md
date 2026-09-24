# DP Digital — Audit de nettoyage

## Demande appliquée

Les secrets présents dans l'archive ont été **conservés volontairement et sans modification**,
conformément à la demande.

Cela inclut notamment le fichier `.env` et ses valeurs existantes.

## Nettoyage effectué

- Suppression des caches/artifacts de build présents (`.next`, `node_modules`, `dist`, `build` lorsqu'ils existaient).
- Suppression de fichiers système/éditeur inutiles (`.DS_Store`, `Thumbs.db`, logs).
- Aucun secret n'a été masqué, remplacé, supprimé ou régénéré.

## Principe

Le nettoyage ne change pas les identifiants, clés ou secrets de fonctionnement.

## Points techniques

Les corrections métier qui nécessitent de connaître exactement les champs Prisma
(par exemple la fraîcheur du heartbeat d'un appareil) ne sont pas inventées
automatiquement : elles doivent rester cohérentes avec `schema.prisma` et les routes existantes.

Ce fichier sert à distinguer le nettoyage de l'archive des changements fonctionnels.
