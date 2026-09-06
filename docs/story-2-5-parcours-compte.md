# Story 2.5 — Parcours compte et mur différé

## État

Implémentation livrée sur `feature/parcours-compte-2-5-2-6-2-8` avec les stories 2.6 et 2.8.
Checks automatiques verts : `npm test` (106 suites / 793 tests), `tsc --noEmit`, `expo lint` ;
backend `make validate` 243 tests à 100 % de couverture.

**Parcours e-mail raccordé (2026-09-06).** `beginEmailUpgrade` appelle
`supabase.auth.updateUser({ email })`, `completeEmailUpgrade` appelle
`verifyOtp({ type: 'email_change' })` puis `updateUser({ password })` puis le provisioning, et
`resendEmailUpgrade` appelle `resend({ type: 'email_change' })`. Reste à valider sur l'instance
dev : `Confirm email` ON, `Secure email change` OFF, template avec `{{ .Token }}`, et confirmer
que `email_change` est bien le type OTP accepté (sinon basculer sur `signup` — seul point
incertain). Procédure : [`story-2-5-manual-test-guide.md`](story-2-5-manual-test-guide.md).

**Sign in with Apple : câblé mais non testable** tant que le compte Apple Developer payant
(99 €/an) n'est pas pris — la capability l'exige. Le reste du lot (invité, e-mail, newsletter,
Keychain) se teste sans compte Apple.

## Parcours et architecture de session

Après l'onboarding, `AuthContext.ensureAnonymousSession()` appelle
`supabase.auth.signInAnonymously()`. La session anonyme porte déjà un UUID et le backend peut
appliquer la clé de quota `quota:{user_id}:{date}`. Les recherches et le premier score restent
accessibles sans compte. `AccountGateContext` ouvre `/account` au premier lancement (invite
dismissible) ou au point d'usage : second check, favori, ou alerte future.

Une création e-mail appelle `updateUser({ email })`, conserve l'UUID anonyme, puis `/verify`
utilise `verifyOtp` avec `type: email_change`; après le mot de passe, le compte
est provisionné par `POST /api/v1/user/provision`. Une création Apple utilise le nonce natif,
`linkIdentity` et le même provisioning. Une connexion existante utilise
`signInWithPassword`/`signInWithIdToken`, abandonne la session anonyme et ne montre ni code ni
sondage. Après création, l'action initiale est rejouée avec une session fraîche.

Un compte permanent qui dépasse le quota voit le Paywall existant, jamais le mur signup. Une
déconnexion locale recrée une session anonyme ; les credentials e-mail restent uniquement en
mémoire React et sont effacés à la fin ou à l'annulation.

## Contrats backend associés

- `POST /api/v1/user/provision` : JWT permanent requis, get-or-create idempotent.
- `GET /api/v1/user/me` : expose `is_anonymous`, `provisioned` et l'état du sondage.
- `PATCH /api/v1/user/survey` : réponse ou skip terminal et idempotent.
- `POST /api/v1/user/favorites` : refuse une session anonyme (`ACCOUNT_REQUIRED`).

Les requêtes REST reproductibles sont dans [`backend/http/user-provisioning.http`](../../backend/http/user-provisioning.http)
et utilisent `CLOUDBREAK_JWT` injecté par l'environnement ; aucun token ne doit être commité.

## Stockage de session — Keychain

La session Supabase persistée par `createClient` passe désormais par
[`secureSessionStorage`](../src/services/secureSessionStorage.ts) (Keychain iOS via
`expo-secure-store`), avec fragmentation sous la limite de 2048 octets et migration
transparente depuis l'ancien stockage AsyncStorage (recopie puis purge du token en clair).
Le plugin `expo-secure-store` est déclaré dans `app.config.ts` : **un rebuild natif
(`npx expo run:ios`) est nécessaire** avant de tester le parcours sur simulateur.

## Vérification

Les tests mobile mockent Supabase, l'AuthContext, le gate et le routeur : ils couvrent le mur
dismissible, quota/favori, session fraîche, erreurs réseau et replay. Ils ne prouvent ni un
dashboard Supabase configuré, ni la réception d'un e-mail, ni une build iOS signée. Le guide
manuel doit confirmer UUID avant/après conversion, quota conservé, annulation, code erroné,
expiration, renvoi et adresse déjà utilisée avant de passer la story à `done`.

`npm test` + `tsc --noEmit` + `expo lint` passent dans le worktree (106 suites / 793 tests).
Le mock Supabase de `src/app/_layout.test.tsx` a été complété (commit `9a10741`) — la suite est
verte. Les tests ne prouvent toujours pas un dashboard Supabase configuré, la réception d'un
e-mail, ni une build iOS signée : le guide manuel doit confirmer UUID avant/après conversion,
quota conservé, annulation, code erroné, expiration, renvoi et adresse déjà utilisée avant de
passer la story à `done`.
