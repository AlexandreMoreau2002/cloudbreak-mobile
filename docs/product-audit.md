# Cloudbreak Mobile — Audit produit

_Dernière mise à jour : 2026-07-01_

---

## Ce qui est fonctionnel aujourd'hui

| Fonctionnalité | État |
|----------------|------|
| Setup Expo SDK 55 / React Native 0.83 | ✅ |
| Design system (tokens couleurs, typo, spacing) | ✅ |
| Navigation Expo Router (tabs + auth guard) | ✅ |
| Auth Supabase (inscription, connexion, logout) | ✅ |
| ThemeContext (light/dark) | ✅ |
| AuthContext + AuthGuard | ✅ |
| i18n FR/EN + toggle runtime | ✅ |
| CI GitHub Actions (lint + tsc + jest + build check) | ✅ |
| Recherche de sommets autocomplete (story 3.3) | ✅ |
| Favoris — ajout, suppression, liste (story 3.3) | ✅ |
| Toggle favori depuis la recherche (story 3.3) | ✅ |
| Tri favoris en premier dans la recherche (story 3.3) | ✅ |
| Écran principal ScoreCard + verdict mer de nuage (story 3.4) | ✅ |
| Home refactorisée en composants (`PeakHeader`, `ConditionsSection`, `FavoritesGrid`) | ✅ |
| Source de données unifiée `useWeekData` pour Home + weekly | ✅ |
| Cache offline AsyncStorage 30 min sur les données semaine | ✅ |
| SelectedPeakContext — sommet/date/heure partagés (story 3.4) | ✅ |
| ScoreSkeleton — loader animé (story 3.4) | ✅ |
| Détail conditions météo + fenêtre temporelle (story 3.5) | ✅ |
| Lever du soleil + indicateur de stabilité (story 3.5) | ✅ |
| Permission géolocalisation opt-in (onboarding step 4 + lien Profil vers réglages iOS) — story 2.3, aucune consommation de la position (prévue story 6.1) | ✅ |
| WeekStrip — changement de jour sur l'écran principal (story 3.5) | ✅ |
| CloudLayerViz — couche nuageuse vs altitude sommet (story 3.5) | ✅ |
| Traduction des codes score i18n via normalizeScoreResponse() (refacto i18n) | ✅ |
| Tests dédiés `cloud-layer-viz/*` + mocks peaks/user/types | ✅ |
| Paywall freemium — modal slide-up déclenché sur QUOTA_EXCEEDED (story 4.2) | ✅ |
| Toggle mensuel/annuel + badge essai gratuit + CTA + dismiss (story 4.2) | ✅ |
| ErrorState — composant générique erreur (icône, titre, message, CTA primaire + secondaire) (story 7.3) | ✅ |
| LoadingSpinner — ActivityIndicator centré générique (story 7.3) | ✅ |
| FavoritesSkeleton — skeleton animé pour la liste favoris (story 7.3) | ✅ |
| AsyncStateView — routing déclaratif loading/error/empty/children (story 7.3) | ✅ |
| HomeSkeleton composite — skeleton fidèle par section de la Home (PeakHeader + ScoreCard + WeekStrip + Conditions + FavoritesGrid) (story 7.3 complément) | ✅ |
| EmptyState branché sur Favorites (était défini, jamais utilisé) (story 7.3) | ✅ |
| États UI unifiés dans Home (quota dismissable, erreur générique) (story 7.3) | ✅ |
| États UI unifiés dans Search et Favorites (story 7.3) | ✅ |
| Login : ActivityIndicator dans bouton submit pendant loading (story 7.3) | ✅ |
| Mode offline-light — cache TTL 3h, bandeau offline, pull-to-refresh, état `OFFLINE_NO_CACHE` sans données obsolètes (story 7.2) | ✅ |
| Instrumentation analytics — `track()` stub DEBUG-only câblé sur ~25 events UI (onboarding, auth, home, recherche, favoris, paywall, profil, session) (story 1.7) | ✅ Stub, aucun réseau |

## Ce qui n'existe pas encore

- Compteur de consultations restantes avant quota (AC3 story 4.2 — à planifier)
- StoreKit 2 — intégration achat In-App réel (epic 4, story suivante)
- Notifications push (epic 5)
- Validation terrain (epic 6)
- Onboarding (epic 7)

---

## Prochaines étapes

1. **Story 3.6** — Message contextuel hors-saison + partage deep link
2. **Epic 4** — Paywall / freemium (StoreKit 2)
