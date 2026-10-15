# Story — fraîcheur des favoris et de l’abonnement

## Objectif

Réduire les GET redondants au changement d’onglet et au retour au premier plan, tout en conservant les modifications de favoris et les droits Premium obtenus par StoreKit.

## Critères d’acceptation

| Critère | Comportement attendu |
| --- | --- |
| Favoris partagés | Accueil, Favoris et Recherche utilisent un `FavoritesProvider` unique ; le premier affichage ne produit qu’un GET favoris. |
| Fraîcheur | Un focus avant 60 secondes après un GET favoris réussi ne relance pas de GET ; un focus ultérieur peut le faire. Les appels simultanés sont regroupés. |
| Mutations | Ajout et suppression réussis sont visibles dans les trois onglets et dans le cache, sans GET de réconciliation. Un GET retardé ne les annule pas. |
| Hors ligne et identité | Un cache favoris valide (moins de 3 heures) reste visible hors ligne ; une autre session ne voit pas cette liste. Un échec GET reste réessayable. |
| Abonnement | Un retour `AppState → active` sous 60 secondes ne relit pas l’abonnement ; au-delà, une seule lecture part. Un droit expiré cesse d’être Premium immédiatement. |
| StoreKit | Un achat ou une restauration vérifiés par le backend prévalent sur une ancienne réponse GET ; une lecture forcée après restauration peut terminer normalement. |

## Fichiers impactés

- `src/contexts/FavoritesContext.tsx` et son test : état unique, cache et concurrence.
- `src/hooks/useFavorites.ts` : accès au contexte partagé.
- `src/app/_layout.tsx` : installation du provider.
- `src/app/(tabs)/index.tsx`, `favorites.tsx`, `search.tsx` et leurs tests : consommation de la liste commune et revalidation au focus.
- `src/contexts/SubscriptionContext.tsx` et son test : fraîcheur, expiration et vérification StoreKit.
- `src/services/dataRefreshDebug.ts` et son test : motif de trace `focus`.

## Validation

Depuis `mobile/` :

```bash
npm test -- --runInBand src/contexts/FavoritesContext.test.tsx src/contexts/SubscriptionContext.test.tsx src/app/'(tabs)'/index.test.tsx src/app/'(tabs)'/favorites.test.tsx src/app/'(tabs)'/search.test.tsx
npm run validate
```

La [description du fonctionnement](../../docs/data-refresh-freshness/fonctionnement.md), le [guide de test manuel](../../docs/data-refresh-freshness/guide-test.md) et `http/data-refresh-freshness.http` couvrent la vérification sur appareil et les sondes API.

## Plan et conception

- Plan : `docs/superpowers/plans/2026-10-14-data-refresh-freshness.md` (chemin consigné dans `.superpowers/sdd/2026-10-14-data-refresh-freshness/plan-path`).
- Spécification : critères résumés dans le plan et dans le brief d’exécution `.superpowers/sdd/2026-10-14-data-refresh-freshness/task-4-brief.md`.
