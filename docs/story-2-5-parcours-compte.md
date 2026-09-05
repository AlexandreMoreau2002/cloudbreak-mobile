# Story 2.5 — Parcours compte et mur différé

## État

Implémentation présente sur `feature/parcours-compte-2-5-2-6-2-8`, **review bloquée**.
Le code et les tests unitaires sont livrés avec les stories 2.6 et 2.8, mais le préflight
Supabase n'est pas levé : Anonymous Auth, le provider Apple, la confirmation e-mail et le
template/type OTP restent à prouver sur l'instance dev. Voir
[`story-2-5-manual-test-guide.md`](story-2-5-manual-test-guide.md). Aucun OTP ou Apple réel
n'est donc déclaré validé.

## Parcours et architecture de session

Après l'onboarding, `AuthContext.ensureAnonymousSession()` appelle
`supabase.auth.signInAnonymously()`. La session anonyme porte déjà un UUID et le backend peut
appliquer la clé de quota `quota:{user_id}:{date}`. Les recherches et le premier score restent
accessibles sans compte. `AccountGateContext` ouvre `/account` au premier lancement (invite
dismissible) ou au point d'usage : second check, favori, ou alerte future.

Une création e-mail appelle `updateUser({ email })`, conserve l'UUID anonyme, puis `/verify`
utilise provisoirement `verifyOtp` avec `type: email_change`; après le mot de passe, le compte
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

## Vérification

Les tests mobile mockent Supabase, l'AuthContext, le gate et le routeur : ils couvrent le mur
dismissible, quota/favori, session fraîche, erreurs réseau et replay. Ils ne prouvent ni un
dashboard Supabase configuré, ni la réception d'un e-mail, ni une build iOS signée. Le guide
manuel doit confirmer UUID avant/après conversion, quota conservé, annulation, code erroné,
expiration, renvoi et adresse déjà utilisée avant de passer la story à `done`.

La dernière exécution de `npm run validate` n'est pas verte : elle échoue sur
`src/app/_layout.test.tsx` car le mock Supabase requis est incomplet. Cette correction est en
cours ; aucune validation finale mobile n'est revendiquée dans cette fiche.
