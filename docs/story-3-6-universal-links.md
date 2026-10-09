# Story 3.6 — Universal Links (résumé technique)

Un lien `https://cloudbreak-app.com/sommet/{slug}` ouvre l'app sur le sommet.

- **app.json** : `ios.associatedDomains` = `applinks:cloudbreak-app.com` et
  `applinks:dev-ops.cloudbreak-app.com?mode=developer` (cette dernière à retirer avant la prod).
  L'AASA est servi par `ops` (`/.well-known/apple-app-site-association`).
- **Route** `src/app/sommet/[slug].tsx` : valide et mémorise le slug, puis `router.replace('/(tabs)')`.
- **Util** `src/utils/pendingPeakLink.ts` : `isValidPeakSlug` (`^[a-z0-9-]{1,100}$`), `set/get/clearPendingPeakSlug`
  (AsyncStorage, clé `pendingPeakSlug`, donnée non sensible, best-effort).
- **Hook** `src/hooks/usePendingPeakLink.ts`, monté dans `AuthGuard` (`_layout.tsx`) : attend session +
  onboarding terminé + segment hors `onboarding`/`sommet`, efface le slug puis `fetchPeakBySlug` -> `setSelectedPeak`.
  Erreurs via `Alert` (`deepLink.*`, `common.networkHint`).
- **Tests** : `pendingPeakLink.test.ts`, `usePendingPeakLink.test.ts`, `src/__tests__/app/sommet-slug.test.tsx`, `src/__tests__/app/root-layout.test.tsx`.

## Limites
- Pas d'écran de chargement dédié : redirection immédiate, erreurs en `Alert`.
- Un seul slug en attente (le dernier écrase le précédent).
- Test réel uniquement sur iPhone (domaine racine + déploiement ops requis) ; build natif nécessaire après changement d'`associatedDomains`.
- Page de repli web en français uniquement (ops n'a que la locale `fr`).
