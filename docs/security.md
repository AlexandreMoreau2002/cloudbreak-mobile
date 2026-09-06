# Security — Mobile

Ce fichier est maintenu automatiquement par l'agent `cloudbreak-security`.
Chaque entrée est horodatée et liée à la story qui l'a générée.

---

## 2026-03-20 Story 2-1 — Auth Supabase

### 🔵 INFO
- **[Supabase session]** Le JWT Supabase est actuellement stocké via `AsyncStorage` (non chiffré) — migration vers `expo-secure-store` toujours requise avant release 1.0.0
- **[AuthContext]** Token jamais loggé en clair — seul le `sub` (user_id) est utilisé dans l'app
- **[AuthGuard]** Redirection via `useSegments` + `useRouter` — pas de `<Redirect>` dans le layout racine (évite les boucles infinies)

### 🟡 WARNING
- **[Supabase]** "Confirm email" désactivé en dev → réactiver avant release 1.0.0
- **[AsyncStorage]** Le cache score ne contient pas de données sensibles ; la session Supabase fait encore exception et constitue une dette suivie ci-dessous
- **[supabaseClient.ts]** CORRECTION DOCUMENTATION : le client Supabase utilise `storage: AsyncStorage` (non chiffré), pas `expo-secure-store`. Le JWT et le refresh token Supabase sont donc stockés en clair dans AsyncStorage. Migrer vers `expo-secure-store` avant release 1.0.0 pour aligner l'implémentation avec la politique de sécurité déclarée dans ce fichier et dans `mobile/CLAUDE.md`.

---

## 2026-09-06 Stories 2.5/2.6/2.8 — Parcours compte : Keychain + consentement newsletter

### 🟢 RÉSOLU
- **[supabaseClient.ts]** La session Supabase (access + refresh token) est désormais rangée
  dans le **Keychain iOS** via `expo-secure-store`, plus dans AsyncStorage en clair.
  L'adaptateur [`secureSessionStorage`](../src/services/secureSessionStorage.ts) fragmente la
  valeur (limite ~2048 octets de SecureStore) et **migre** une session héritée d'AsyncStorage
  au premier accès (recopie dans le Keychain puis suppression du token en clair) — aucune
  reconnexion forcée. Plugin `expo-secure-store` ajouté à `app.config.ts` → **rebuild natif
  requis** (`npx expo run:ios`). Clôt la dette ouverte depuis la story 2-1
  (`security_jwt_asyncstorage_debt`).

### 🔵 INFO
- **[useNewsletterConsent / api/user.ts]** Le consentement newsletter est lu via
  `GET /api/v1/user/me` et modifié via `PATCH /api/v1/user/preferences` (compte permanent
  requis, `403 ACCOUNT_REQUIRED` sinon). Aucune donnée personnelle nouvelle stockée sur
  l'appareil ; le booléen transite en HTTPS, jamais loggé (seul `if (DEBUG) console.debug`).
- **[RGPD]** Le retrait de consentement est aussi simple que l'octroi (une bascule dans
  Profil → Compte → Newsletter), conforme à l'art. 7-3.

---

## 2026-07-17 Story 7-2 — Mode Offline-Light & Cache TTL

### 🔵 INFO
- **[AsyncStorage cache]** Payload du cache `useWeekData` inspecté : contient uniquement `ScoreResponse` (score, verdict, cloud_base, conditions météo, nom/altitude du sommet). Aucun token, user_id, email, ou donnée personnelle identifiante. Conforme.
- **[Cache key]** Clé `cache:weekdata:v4:{peakId}:{today}` — préfixe `cache:` respecté, `peakId` est un UUID sommet (pas un user_id). Aucune PII dans la clé.
- **[Token]** Le paramètre `token` dans `useWeekData` est transmis uniquement en header HTTP à `fetchScore()` — jamais écrit dans AsyncStorage. Conforme.
- **[NetInfo]** `@react-native-community/netinfo` utilisé en lecture seule (`NetInfo.fetch()` retourne l'état réseau). Aucune donnée sensible impliquée. Pas de nouvelle surface d'attaque.

### Verdict
SECURE — aucune donnée sensible exposée par la story 7.2.

---

## 2026-07-21 Story 1-7 — Taxonomie & instrumentation events (mobile)

`track()` (stub DEBUG-only, `src/services/analytics.ts`) câblé sur ~20 points (onboarding, auth, home, recherche, favoris, paywall, profil, session).

### 🔵 INFO
- **[usePeakSearch.ts:47]** `search_performed` ne loggue que `query_length` et `results_count` — jamais le texte brut de la recherche. Conforme.
- **[useLegalLinks.ts:23]** `legal_link_opened` ne loggue que `link_type` (catégorisé via `getLinkType()`) — jamais l'URL complète. Conforme.
- Tous les autres events audités (`peak_selected`, `paywall_opened`, `plan_selected`, `score_hour_changed`, `offline_mode_shown`, `app_backgrounded`, etc.) ne transportent que des IDs (`peak_id`), enums (`period`, `scheme`, `locale`) ou métriques numériques (`session_duration_ms`, `cached_minutes_ago`) — aucune PII
- Pas de duplication détectée avec les events backend pour une même action : `delete_account_initiated` (mobile, intention côté profil) vs `account_deleted` (backend, confirmation après suppression effective) couvrent deux étapes distinctes du même flux — un seul propriétaire par étape

### 🟡 WARNING
- **[useAuthForm.ts:36]** `auth_submitted` envoie `error_code: error.message` — c'est le message d'erreur brut retourné par Supabase (`AuthError.message`, texte libre, ex: "Invalid login credentials"), pas un code catégorisé stable comme le nom de la property le laisse penser. Risque : texte libre non maîtrisé par Cloudbreak, sujet à changer de format côté Supabase, et incohérent avec la convention appliquée ailleurs (`search_performed`, `legal_link_opened` qui catégorisent strictement). Pas de PII confirmée dans les messages Supabase actuels (aucun ne contient email/mot de passe), mais recommandation : mapper `error.message`/`error.status` vers un enum stable (`invalid_credentials`, `email_taken`, `weak_password`, `rate_limited`, `unknown`) avant le branchement PostHog réel, pour éviter d'envoyer du texte libre non contrôlé à un tiers.

### Verdict
CORRECTIONS RECOMMANDÉES AVANT BRANCHEMENT POSTHOG — aucun blocage pour le merge de la story 1.7 (stub sans réseau), mais `useAuthForm.ts:36` à corriger avant que `track()` envoie réellement vers PostHog.

---

## 2026-07-22 Story 2-3 — Permission Géolocalisation (Opt-in sans Blocage)

### 🔵 INFO
- **[app.config.ts]** Permission foreground uniquement (`NSLocationWhenInUseUsageDescription` via le plugin `expo-location` avec `locationWhenInUsePermission`) — jamais "Always"/background.
- **[AuthContext]** Aucune coordonnée GPS n'est lue, stockée ou transmise par cette story : seul le statut de permission (`granted`/`denied`/`undetermined`) est gardé en mémoire dans `AuthContext`, jamais persisté sur disque (ni AsyncStorage, ni SecureStore).
- **[useLocationPermission / useLocationSettingsLink]** Aucun appel réseau, aucune donnée transmise au backend.

### Verdict
SECURE — aucune donnée sensible supplémentaire exposée par la story 2.3. La consommation réelle de la position est désormais couverte par la story 6.1 ; la rétention/anonymisation des coordonnées reste à réévaluer avant release 1.0.0.

---

## 2026-07-24 Story 6-1 — Validation Terrain (Confirmation/Infirmation)

### 🔵 INFO
- **[useTerrainValidation.ts / useTerrainAutoDetect.ts]** Première utilisation réelle de `getCurrentPositionAsync` / `watchPositionAsync` dans le projet. Jusqu'à la story 2.3, seul le **statut** de permission (`granted`/`denied`/`undetermined`) était lu via `getForegroundPermissionsAsync` — aucune coordonnée réelle n'était jamais lue. Cette story change ça : des coordonnées GPS réelles sont désormais lues sur l'appareil, transitent en mémoire (`useState` dans le hook), puis quittent l'appareil au moment de `answer()` (`postTerrainValidation` → `POST /api/v1/validations`, `lat`/`lng` dans le body).
- **[useTerrainAutoDetect.ts]** Le watcher de position (`watchPositionAsync`) n'est actif que pendant que l'app est **au premier plan** et qu'un sommet/score est activement affiché (dépendances `useEffect` : `locationPermission`, `target`, `onNear` — l'abonnement est nettoyé via `subscription.remove()` au démontage ou changement de sommet). Aucun mode "Always"/background n'est demandé (`app.config.ts` inchangé depuis la story 2.3 : `locationWhenInUsePermission` uniquement). Choix de conception délibéré, conforme à la politique "pas de tracking en arrière-plan" — pas de collecte de position hors du contexte explicite "l'utilisateur regarde une prévision".
- **[validations.ts]** Les coordonnées ne sont jamais persistées sur l'appareil (ni AsyncStorage ni SecureStore) — elles restent en `useState` le temps du flux de validation, puis sont envoyées une seule fois au backend via HTTPS, jamais loggées en clair (seul `if (DEBUG) console.debug` en dev, désactivé en prod).
- **[validations.ts]** Bug corrigé cette story : le payload n'était auparavant pas construit (l'appel API n'envoyait rien) — c'est un fix de fonctionnalité, pas une régression de sécurité introduite (aucune donnée n'était envoyée avant, donc aucune fuite antérieure liée à ce bug).
- **[permission refusée]** Si la permission de localisation est refusée, le flux `validateManually()` permet de valider sans position (`lat`/`lng` non envoyés, `undefined`) — aucune donnée de géolocalisation n'est requise pour utiliser la fonctionnalité, conforme au principe "opt-in sans blocage" posé en story 2.3.

### 🟡 WARNING
- **[Dette pré-existante, non aggravée par cette story]** Le JWT Supabase reste stocké en clair dans AsyncStorage (`supabaseClient.ts` utilise `storage: AsyncStorage`, pas `expo-secure-store`) — dette déjà tracée depuis la story 2-1 et en mémoire projet (`security_jwt_asyncstorage_debt`). Cette story n'introduit aucun nouvel usage de `SecureStore` ni de nouvelle exposition du token ; le `token` transite comme avant, uniquement en header HTTP.

### Verdict
SECURE — les coordonnées GPS réelles introduites par cette story ne quittent l'appareil que sur action explicite de l'utilisateur (réponse Oui/Non dans le sheet), ne sont jamais persistées localement, et le watcher d'auto-détection est strictement scopé au foreground avec un sommet actif. Réévaluer côté backend, comme noté en story 2.3, si une politique de rétention/anonymisation de `terrain_validations.lat/lng` est nécessaire avant release 1.0.0.
