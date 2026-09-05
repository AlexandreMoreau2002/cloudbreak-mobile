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
| `src/hooks/useAuthForm.ts` | Logique du formulaire login/signup extraite du composant |
| `src/app/_layout.tsx` | AuthGuard via `useSegments` + `useRouter` — évite la boucle infinie |
| `src/app/(auth)/_layout.tsx` | Layout des routes non-authentifiées |
| `src/app/(auth)/login.tsx` | Écran login/inscription — utilise `useTheme()` + `i18n` |
| `src/app/(tabs)/profile.tsx` | Bouton de déconnexion |
| `src/locales/fr.ts` + `en.ts` | Clés `auth.*` ajoutées |
| `src/services/supabaseClient.test.ts` | Tests client Supabase |
| `src/contexts/AuthContext.test.tsx` | Tests context auth — 100% coverage |
| `src/contexts/ThemeContext.test.tsx` | Tests context thème — light + dark |
| `src/hooks/useAuthForm.test.ts` | Tests hook formulaire — tous les cas |
| `src/app/(auth)/login.test.tsx` | Tests écran login |
| `src/app/(tabs)/profile.test.tsx` | Tests écran profil |

## Comment ça fonctionne

### Flux d'authentification

```
Utilisateur → login.tsx → useAuthForm → supabase.auth.signInWithPassword()
→ Supabase émet un JWT ECC P-256
→ AuthContext stocke la session dans AsyncStorage
→ AuthGuard (_layout.tsx) détecte session → router.replace('/(tabs)')
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

1. L'écran de login s'affiche (session absente)
2. Créer un compte avec email/mot de passe
3. Connexion réussie → redirection vers l'app
4. La session est persistée — relancer l'app saute le login
5. Profile → "Se déconnecter" → retour login

## Acceptance Criteria vérifiés

- [x] Écran login/inscription affiché si non authentifié
- [x] Connexion réussie → redirection vers l'app principale
- [x] Session persistée après relance de l'app
- [x] signOut fonctionne et redirige vers login
- [x] Design system respecté (useTheme, i18n, pas de strings hardcodées)
- [x] 100% test coverage
- [x] 0 erreur lint / TypeScript
