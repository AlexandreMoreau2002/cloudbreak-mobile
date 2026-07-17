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
