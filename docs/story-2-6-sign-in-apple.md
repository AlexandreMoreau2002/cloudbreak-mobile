# Story 2.6 — Sign in with Apple

## État

Code livré sur `feature/parcours-compte-2-5-2-6-2-8`, **review bloquée** par la configuration
Apple/Supabase et l'absence de preuve sur une build native. Le provider Apple est actuellement
désactivé sur l'instance dev (`external.apple: false`) ; ce document ne prétend pas qu'un login
Apple réel a fonctionné.

## Implémentation

`AccountForm` n'affiche le bouton que lorsque `Platform.OS === 'ios'`. `AuthContext` génère un
nonce aléatoire, transmet son hash à `expo-apple-authentication`, puis le nonce brut à Supabase
avec le `identityToken` Apple. En mode création, `supabase.auth.linkIdentity` lie Apple à la
session anonyme et conserve son UUID ; en mode connexion,
`signInWithIdToken` ouvre le compte existant et abandonne l'identité anonyme. Dans les deux cas,
la session Supabase est relue avant `POST /api/v1/user/provision`.

Une création Apple saute le code e-mail et ouvre le mini-sondage ; une reconnexion ne montre ni
code ni sondage. L'annulation native est silencieuse et ne détruit pas la session anonyme.

## Préflight et test manuel

Avant les tests, depuis `mobile/`, installer les dépendances, synchroniser la configuration
iOS existante puis reconstruire l'application :

```bash
npm install
npx expo prebuild --platform ios --no-install
npx expo run:ios
```

Le prébuild sans `--clean` applique le plugin Apple et la capability Sign in with Apple.
Redémarrer Metro seul ne fournit pas les modules natifs `ExpoCrypto` et
`ExpoAppleAuthentication` au binaire déjà installé. L'échec de l'import d'`AuthContext` peut
alors entraîner des erreurs de routes sans export par défaut et de providers manquants.

Activer le provider Apple dans le projet Supabase ciblé, configurer les identifiants Apple
associés au bundle iOS et produire une build native avec la capability Sign in with Apple. Tester
ensuite : création depuis invité (UUID identique, `is_anonymous` devient false), reconnexion
existante (pas de sondage), annulation, token d'identité absent, réseau indisponible et bouton
absent sur Android.

Les tests Jest mockent `expo-apple-authentication` et Supabase : ils valident le nonce, les
intentions `creation`/`connexion`, la garde iOS et les erreurs. Ils ne remplacent pas le test
réel iOS/Supabase ; ne consigner que UUID et états de session, jamais les tokens.
