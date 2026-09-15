# Déploiement DP Digital sur Netlify

## Point important sur le téléversement direct

DP Digital est une application **Next.js avec API serveur + Prisma + PostgreSQL**. Elle ne peut pas fonctionner correctement comme un simple site HTML statique téléversé dans Netlify Drop.

Le fichier `netlify.toml` est déjà présent et configure le build Next.js. Le mode recommandé est :

1. importer ce projet dans Netlify ;
2. laisser Netlify exécuter `npm run build` ;
3. renseigner les variables d'environnement ;
4. connecter Neon/PostgreSQL ;
5. lancer les migrations Prisma.

### Si tu veux absolument utiliser « téléverser directement »

Il faut d'abord produire localement l'artefact Netlify avec les dépendances installées et le build terminé. **Le ZIP source de cette étape n'est volontairement pas présenté comme un artefact déjà déployable**, car cela donnerait un faux sentiment de sécurité : les API, l'authentification et Prisma nécessitent le build serveur Next/Netlify.

Variables minimales :

- `DATABASE_URL`
- `ADMIN_INITIAL_CODE` uniquement pendant l'initialisation/seed

Ne téléverse jamais un `.env` contenant des secrets dans le ZIP.
