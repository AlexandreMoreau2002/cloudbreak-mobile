# Cloudbreak Mobile — Audit produit

_Dernière mise à jour : 2026-10-08_

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
| Nom d’usage facultatif dans le Profil (story 2.9), édition/effacement, initialisation Apple, renouvellement JWT et initiales Unicode | 🟡 Tests automatisés verts ; validation iPhone réelle à effectuer |
| 2026-10-09 — Universal Links `cloudbreak-app.com/sommet/{slug}` (story 3.6) : `associatedDomains`, route `sommet/[slug]`, slug en attente validé puis consommé après onboarding | 🟡 Tests automatisés verts ; déploiement ops et validation iPhone en attente |
| i18n FR/EN + toggle runtime | ✅ |
| CI GitHub Actions (lint + tsc + jest + build check) | ✅ |
| Socle EAS iOS — projet Expo lié, profils development/preview/production et credentials Apple App Store / Ad Hoc internes | ✅ |
| App iOS créée dans App Store Connect — nom FR « Cloudbreak – Mer de nuage » | ✅ Configuration initiale |
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
| Permission géolocalisation opt-in (onboarding step 4 + lien Profil vers réglages iOS) — story 2.3 | ✅ |
| WeekStrip — changement de jour sur l'écran principal (story 3.5) | ✅ |
| CloudLayerViz — couche nuageuse vs altitude sommet (story 3.5) | ✅ |
| Traduction des codes score i18n via normalizeScoreResponse() (refacto i18n) | ✅ |
| Tests dédiés `cloud-layer-viz/*` + mocks peaks/user/types | ✅ |
| Paywall freemium — modal slide-up déclenché sur QUOTA_EXCEEDED (story 4.2) | ✅ |
| Paywall Premium StoreKit 2 — produits mensuel/annuel, prix localisé Apple, achat/restauration et essai conditionnel de 7 jours (story 4.3) | 🟡 Implémenté sur branche ; appareil Sandbox / PR à valider |
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
| Validation terrain confirmation/infirmation avec détection GPS foreground (story 6.1) | ✅ Sans photo |
| Parcours invité, mur différé et replay d'action (stories 2.5/2.6/2.8) | 🟡 Implémenté, review bloquée par le préflight Supabase |
| Création Apple iOS (story 2.6) | 🟡 Code présent, provider/build native non validés |
| Mini-sondage post-création (story 2.8) | 🟡 Code présent, persistance réelle non validée |
| Retrait/ré-octroi consentement newsletter — Profil → Compte → Newsletter, `PATCH /api/v1/user/preferences` (stories 2.5/2.8, RGPD) | 🟡 Code présent, persistance réelle non validée |
| Mot de passe oublié — flow OTP in-app (`/reset` → `/reset-confirm`, `resetPasswordForEmail` + `verifyOtp type:'recovery'`) (story 2.7) | 🟡 Code présent, template Dashboard + test réel à valider |
| Politique mot de passe — plancher 6 caractères (`MIN_PASSWORD_LENGTH`), jauge de force purement informative, plus de blocage sur les 4 critères de complexité (2026-09-11) | ✅ |
| Durcissement post-merge auth (2026-09-12) — timeout HTTP qui abort réellement (`AbortController`), garde env Supabase (échec explicite si config absente), retry provisioning distinct sur verify/account (login+Apple) | ✅ |
| Préférences de notifications (Profil → Notifications, 3 toggles indépendants, story 2.2) | ✅ |
| Profil réaligné sur la maquette du 2026-09-15 (sections, danger rows, footer version) | ✅ |
| Signal d'installation invité persistant dans Keychain/SecureStore, transmis uniquement aux scores authentifiés (mitigation quota) | ✅ |

## Ce qui n'existe pas encore

- Compteur de consultations restantes avant quota (AC3 story 4.2 — à planifier)
- Photo optionnelle après validation + calcul du taux de précision (story 6.2)
- Validation Sandbox/App Store Connect de StoreKit 2 sur appareil réel (story 4.3)
- Notifications push (epic 5), désormais débloquables côté credentials mais non implémentées
- Validation native réelle de Sign in with Apple
- Universal Links : code fait (story 3.6), déploiement/validation iPhone en attente
- Métadonnées et localisation anglaise de la fiche App Store (« Cloudbreak – Sea of Clouds »)
- Analytics PostHog réel (compte/SDK/réseau)
- Déploiement VPS / production (epic 1)
- Préflight Supabase du parcours compte : Anonymous Auth, Confirm email + template OTP, provider Apple et preuve UUID avant/après

---

## Prochaines étapes

1. **Story 6.2** — Photo optionnelle + calcul du taux de précision par zone
2. **StoreKit 2** — paiement réel (story 4.3), à implémenter et tester sur une build native
3. **Notifications push** — configuration et implémentation APNs/Epic 5 à réaliser
