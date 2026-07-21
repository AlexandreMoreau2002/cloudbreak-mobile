# Security — Mobile

Ce fichier est maintenu automatiquement par l'agent `cloudbreak-security`.
Chaque entrée est horodatée et liée à la story qui l'a générée.

---

## 2026-03-20 Story 2-1 — Auth Supabase

### 🔵 INFO
- **[SecureStore]** JWT Supabase stocké via `expo-secure-store` — chiffré par le keychain iOS, non accessible depuis l'extérieur de l'app
- **[AuthContext]** Token jamais loggé en clair — seul le `sub` (user_id) est utilisé dans l'app
- **[AuthGuard]** Redirection via `useSegments` + `useRouter` — pas de `<Redirect>` dans le layout racine (évite les boucles infinies)

### 🟡 WARNING
- **[Supabase]** "Confirm email" désactivé en dev → réactiver avant release 1.0.0
- **[AsyncStorage]** Ne pas stocker de données sensibles (token, clés) — réservé au cache score (données non sensibles)
- **[supabaseClient.ts]** CORRECTION DOCUMENTATION : le client Supabase utilise `storage: AsyncStorage` (non chiffré), pas `expo-secure-store`. Le JWT et le refresh token Supabase sont donc stockés en clair dans AsyncStorage. Migrer vers `expo-secure-store` avant release 1.0.0 pour aligner l'implémentation avec la politique de sécurité déclarée dans ce fichier et dans `mobile/CLAUDE.md`.

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
