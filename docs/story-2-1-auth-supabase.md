# Story 2-1 — Authentification Supabase (Mobile)

> Le flux initial login/signup de cette story a depuis été étendu par le parcours invité des
> stories 2.5/2.6/2.8. La session est encore persistée via AsyncStorage (dette à migrer vers
> SecureStore). Les preuves OTP, Anonymous Auth et Apple restent dans
> [`story-2-5-manual-test-guide.md`](story-2-5-manual-test-guide.md) et ne sont pas affirmées ici.

## Ce qui a été fait

| Fichier | Rôle |
|---------|------|
| `app.config.ts` | Config Expo — URL/clé Supabase via variables d'environnement |
| `metro.config.js` | Exclusion des fichiers `*.test.*` du bundle Metro |
| `src/services/supabaseClient.ts` | Client Supabase avec AsyncStorage — credentials depuis `expo-constants` |
| `src/contexts/AuthContext.tsx` | Context React : session, signUp, signIn, signOut — erreur getSession gérée |
| `src/contexts/ThemeContext.tsx` | ThemeProvider avec `useMemo` pour éviter les re-renders inutiles |
| `src/app/_layout.tsx` | AuthGuard via `useSegments` + `useRouter` — évite la boucle infinie |
| `src/app/account.tsx` | Écran compte générique : création ou connexion |
| `src/app/verify.tsx` | Saisie du code e-mail à six chiffres (type OTP provisoire) |
| `src/app/survey.tsx` | Mini-sondage post-création, skippable |
| `src/app/(tabs)/profile.tsx` | Bouton de déconnexion |
| `src/locales/fr.ts` + `en.ts` | Clés `auth.*` ajoutées |
| `src/services/supabaseClient.test.ts` + `src/services/supabaseClient.real.test.ts` | Tests client mockés et real séparés |
| `src/contexts/AuthContext.test.tsx` | Tests context auth — 100% coverage |
| `src/contexts/ThemeContext.test.tsx` | Tests context thème — light + dark |
| `src/contexts/AccountGateContext.test.tsx` | Tests mur différé et replay |
| `src/app/account.test.tsx` + `verify.test.tsx` + `survey.test.tsx` | Tests écrans du parcours actuel |
| `src/components/account/*.test.tsx` | Tests formulaires, code et sondage |
| `src/app/(tabs)/profile.test.tsx` | Tests écran profil |

## Comment ça fonctionne

### Flux d'authentification

```
Utilisateur → account.tsx → AuthContext → Supabase Auth
→ JWT ECC P-256 → session AsyncStorage → AuthGuard (_layout.tsx)
→ `(tabs)` ; création e-mail : `/verify` → `/survey`
```

### AuthGuard — sans boucle infinie

`AuthGuard` utilise `useSegments` pour détecter le groupe de route courant et `useRouter` pour rediriger dans un `useEffect`. Cela évite la boucle infinie que causerait un `<Redirect>` dans le layout racine.

### Variables d'environnement

Les credentials Supabase sont lus depuis `app.config.ts` via `Constants.expoConfig.extra` — jamais hardcodés dans le code source.

### Fichiers de test exclus du bundle

`metro.config.js` exclut les fichiers `*.test.*` et `*.spec.*` du bundle Metro pour éviter que les imports Node.js de Jest ne cassent l'app.

### Supabase — configuration dev et évolution du flow

> ⚠️ **Dette de configuration — à corriger avant release 1.0.0**

- Le réglage historique de cette story était **Confirm email = OFF**. Pour le flow OTP des
  stories 2.5/2.8, il doit être **ON** et le template doit envoyer `{{ .Token }}`. Cette
  configuration dashboard, la réception d'un vrai code et le `verifyOtp.type` accepté ne sont
  pas encore validés.
- Anonymous Auth et Apple doivent également être activés pour le nouveau parcours ; voir le
  guide de préflight. Aucun OTP/Apple réel n'est considéré comme testé tant que cette gate n'est
  pas levée sur une build native.

## Comment tester

```bash
# Tests automatisés
npm test               # 27 tests, 100% coverage

# Application
npx expo run:ios       # première fois (compile le build natif)
npm start              # fois suivantes
```

1. Après onboarding, la session anonyme permet d'explorer la Home
2. Une action gardée ouvre `/account`
3. Création e-mail → `/verify` puis `/survey`; connexion existante → Home sans sondage
4. Profile → déconnexion → nouvelle session anonyme

## Acceptance Criteria vérifiés

- [x] Écran `/account` de création/connexion et redirection vers l'app principale
- [x] Parcours `/verify` et `/survey` couvert par tests mockés
- [x] Déconnexion locale et retour en session invitée
- [x] Design system respecté (useTheme, i18n, pas de strings hardcodées)
- [ ] Validation finale `npm run validate` à relancer après le correctif du mock Supabase de
  `_layout.test.tsx` (lot `9a10741`)
