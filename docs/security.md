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
