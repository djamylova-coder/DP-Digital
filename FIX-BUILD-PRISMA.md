# Correctif build Netlify — Prisma

## Problème constaté

Le premier build Netlify a échoué pendant `prisma generate` avec l'erreur Prisma `P1012`.
Le fichier `prisma/schema.prisma` contenait plusieurs définitions Prisma condensées sur une même ligne, notamment le bloc `datasource`, le bloc `generator` et plusieurs modèles.

## Correctif appliqué

Le schéma a été réécrit avec le format Prisma standard :

- `datasource` et `generator` ont chacun leurs propriétés sur des lignes distinctes ;
- chaque enum est structurée ligne par ligne ;
- chaque champ de modèle est sur sa propre ligne ;
- les relations, index et contraintes uniques restent inchangés ;
- aucune donnée métier, règle d'exécution ou migration n'a été modifiée par ce correctif.

## Vérification

Le build Netlify précédent a bien identifié le défaut de parsing du schéma. Une nouvelle exécution Netlify doit maintenant passer cette étape `prisma generate` et révéler, s'il en existe, les éventuelles erreurs suivantes de compilation ou de configuration.

L'installation locale complète des dépendances n'a pas pu être terminée dans l'environnement de préparation ; il ne faut donc pas considérer ce correctif comme une certification de build complète tant qu'un nouveau build Netlify n'est pas passé avec succès.
