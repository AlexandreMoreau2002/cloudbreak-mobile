# Story 3.6 — Universal Links (résumé technique)

Un lien `{hôte ops}/sommet/{slug}` ouvre l'app sur le sommet. L'hôte est celui du service `ops`
de l'environnement (le domaine racine `cloudbreak-app.com` n'héberge rien) :

| Environnement | `EXPO_PUBLIC_LEGAL_BASE_URL` | Lien de partage | `ios.associatedDomains` |
|---|---|---|---|
| Local | `http://localhost:3100` | `http://localhost:3100/sommet/{slug}` | aucun (http non accepté par Apple) |
| Dev | `https://dev-ops.cloudbreak-app.com` | `https://dev-ops.cloudbreak-app.com/sommet/{slug}` | `applinks:dev-ops.cloudbreak-app.com?mode=developer` |
| Prod | `https://ops.cloudbreak-app.com` (défaut) | `https://ops.cloudbreak-app.com/sommet/{slug}` | `applinks:ops.cloudbreak-app.com` |

- **Hôte ops** : `src/constants/opsUrl.ts` exporte `OPS_BASE_URL` (variable `EXPO_PUBLIC_LEGAL_BASE_URL`,
  slash final retiré), utilisé par `legalUrls.ts` et `getShareForecastUrl`.
- **Associated Domains** : `plugins/associatedDomains.js` (`getAssociatedDomains`) appelé par `app.config.ts`
  (plus rien dans `app.json`). Hors prod, `?mode=developer` fait vérifier l'AASA directement par l'iPhone
  (builds de dev). L'AASA est servi par `ops` (`/.well-known/apple-app-site-association`).
- **Route** `src/app/sommet/[slug].tsx` : valide et mémorise le slug, puis `router.replace('/(tabs)')`.
- **Util** `src/utils/pendingPeakLink.ts` : `isValidPeakSlug` (`^[a-z0-9-]{1,100}$`), `set/get/clearPendingPeakSlug`
  (AsyncStorage, clé `pendingPeakSlug`, donnée non sensible, best-effort).
- **Hook** `src/hooks/usePendingPeakLink.ts`, monté dans `AuthGuard` (`_layout.tsx`) : attend session +
  onboarding terminé + segment hors `onboarding`/`sommet`, efface le slug puis `fetchPeakBySlug` -> `setSelectedPeak`.
  Erreurs via `Alert` (`deepLink.*`, `common.networkHint`).
- **Tests** : `opsUrl.test.ts`, `plugins/associatedDomains.test.js`, `pendingPeakLink.test.ts`, `usePendingPeakLink.test.ts`, `src/__tests__/app/sommet-slug.test.tsx`, `src/__tests__/app/root-layout.test.tsx`.

## Limites
- Pas d'écran de chargement dédié : redirection immédiate, erreurs en `Alert`.
- Un seul slug en attente (le dernier écrase le précédent).
- Test réel uniquement sur iPhone (déploiement ops de l'environnement requis) ; build natif nécessaire après changement d'`associatedDomains`.
- Page de repli web en français uniquement (ops n'a que la locale `fr`).
