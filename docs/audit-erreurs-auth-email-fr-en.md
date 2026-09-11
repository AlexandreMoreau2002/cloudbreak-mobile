# Audit — gestion des erreurs auth / e-mail (FR/EN)

Audit read-only du parcours auth/e-mail de l'app mobile Cloudbreak, branche
`feature/parcours-compte-2-5-2-6-2-8`. Couvre : création de compte / connexion
(`account.tsx`), vérification OTP e-mail (`verify.tsx`), mot de passe oublié —
demande (`reset.tsx`) et confirmation (`reset-confirm.tsx`), `AuthContext.tsx`,
les fichiers `fr.ts` / `en.ts`, et le statut des templates e-mail Supabase
documenté dans `docs/email.md` (racine du repo).

Aucun fichier de code n'a été modifié. Ce document est la seule pièce écrite.

---

## 1. Tableau récapitulatif

| # | Trigger | Écran(s) | Clé FR | Clé EN | Statut |
|---|---------|----------|--------|--------|--------|
| 1 | Champ e-mail/mot de passe vide (validation client) | account, reset | `auth.emptyFields` | `auth.emptyFields` | OK |
| 2 | E-mail sans `@` (validation client) | reset | `reset.errorEmail` | `reset.errorEmail` | OK |
| 3 | E-mail déjà utilisé — `message === 'user already registered'` | account | `account.errorTaken` | `account.errorTaken` | Gap trouvé |
| 4 | Mot de passe / identifiants invalides — message contient `invalid`/`password`/`mot de passe` | account | `account.errorWrongPassword` | `account.errorWrongPassword` | Gap trouvé (sur-capture) |
| 5 | Upgrade e-mail indisponible (session non anonyme) — `message === 'EMAIL_UPGRADE_UNAVAILABLE'` | account | `account.emailUpgradeUnavailable` | `account.emailUpgradeUnavailable` | OK |
| 6 | Erreur réseau / erreur non classifiée (fallback générique) | account | `account.errorNetwork` | `account.errorNetwork` | Gap trouvé (masque la vraie cause) |
| 7 | Apple — annulation utilisateur (`ERR_REQUEST_CANCELED`) | account | — (silencieux) | — (silencieux) | OK (volontaire) |
| 8 | Apple — plateforme non iOS | account | jamais atteint | jamais atteint | Dead code |
| 9 | Apple — pas de jeton d'identité retourné | account | absorbé par `account.errorNetwork` | idem | Gap trouvé (message interne non exploité) |
| 10 | Erreur inattendue générique côté `AuthContext` (`Service d'authentification indisponible`) | account, reset, verify (indirect) | absorbé par `*.errorNetwork` | idem | Gap trouvé (hardcodé FR, jamais localisé) |
| 11 | Code OTP e-mail invalide/expiré (upgrade) — tout message ≠ `EMAIL_UPGRADE_PROVISIONING_FAILED` | verify | `verify.error` | `verify.error` | Gap trouvé (sur-capture, y compris erreurs réseau) |
| 12 | Provisioning compte échoué après OTP validé — `message === 'EMAIL_UPGRADE_PROVISIONING_FAILED'` | verify | `verify.provisioningError` + `verify.retryProvisioning` | idem | OK |
| 13 | Retry provisioning — nouvel échec | verify | **aucune clé affichée** | **aucune clé affichée** | **Gap critique — feedback silencieux** |
| 14 | Renvoi de code OTP e-mail échoué | verify | `verify.resendError` | `verify.resendError` | **Gap critique — clé i18n manquante dans fr.ts ET en.ts** |
| 15 | Rate limit sur renvoi OTP e-mail (upgrade) | verify | non distingué (retombe dans #14, cassé) | idem | Gap trouvé (pas de distinction rate-limit contrairement à `reset`) |
| 16 | Rate limit sur demande de reset mot de passe | reset | `reset.errorRateLimit` | `reset.errorRateLimit` | OK |
| 17 | Erreur réseau / autre sur demande de reset | reset | `reset.errorNetwork` | `reset.errorNetwork` | OK |
| 18 | Mot de passe trop faible à la confirmation reset — message contient `weak`/`password`/`at least` | reset-confirm | `reset.errorPassword` | `reset.errorPassword` | OK |
| 19 | Code de reset invalide/expiré — message contient `token`/`otp`/`expired`/`invalid` | reset-confirm | `reset.errorCode` | `reset.errorCode` | OK |
| 20 | Erreur réseau / autre sur confirmation reset (fallback) | reset-confirm | `reset.errorNetwork` | `reset.errorNetwork` | Gap trouvé (chemin `EMAIL_UPGRADE_PROVISIONING_FAILED` testé mais inatteignable) |
| 21 | Rate limit / erreur sur renvoi de code reset | reset-confirm | `reset.errorRateLimit` / `reset.errorNetwork` | idem | OK |
| 22 | Locale des e-mails d'auth (sync best-effort, échec silencieux) | account, verify, reset (indirect) | pas de message utilisateur (volontaire) | idem | OK (volontaire, voir §5) |

---

## 2. Détail par cas d'erreur

### 2.1 Champs vides (validation client)
- **Trigger** : `!email.trim() || !password` dans `submit()` — `src/app/account.tsx:53`. Équivalent pour l'e-mail seul dans `reset.tsx:37`.
- **FR** : `auth.emptyFields` = `'Veuillez remplir tous les champs'` (`src/locales/fr.ts:238`)
- **EN** : `auth.emptyFields` = `'Please fill in all fields'` (`src/locales/en.ts`, même bloc `auth`)
- **Écrans** : account (création + connexion), reset (demande).
- **Notes** : cohérent FR/EN. Réutilise le namespace générique `auth.*` plutôt que `account.*`/`reset.*` — pas un bug mais un léger écart de convention (le reste des erreurs de ces deux écrans vit dans leur propre namespace).

### 2.2 E-mail invalide (validation client, reset uniquement)
- **Trigger** : `!normalizedEmail.includes('@')` — `src/app/reset.tsx:41`.
- **FR** : `reset.errorEmail` = `'E-mail invalide.'`
- **EN** : `reset.errorEmail` = `'Invalid email.'`
- **Écran** : reset (demande).
- **Notes** : validation extrêmement permissive (`includes('@')` seul), mais cohérent FR/EN. `account.tsx` n'a pas de validation de format e-mail équivalente côté client — seul le check "champ vide" existe ; un e-mail malformé y passe directement à Supabase et retombe dans le fallback réseau (#2.6) si Supabase le rejette. Incohérence mineure entre les deux écrans.

### 2.3 E-mail déjà utilisé
- **Trigger** : `DUPLICATE_ACCOUNT_MESSAGES = new Set(['user already registered'])`, testé dans `errorCopy()` — `src/app/account.tsx:21` et `:43-45`. Alimenté par `beginEmailUpgrade()` → `supabase.auth.updateUser({ email })` (`src/contexts/AuthContext.tsx:344`).
- **FR** : `account.errorTaken` = `'Cet e-mail est déjà pris.'`
- **EN** : `account.errorTaken` = `'This email is already in use.'`
- **Écran** : account (création).
- **Notes/gaps** : le test `src/app/account.test.tsx:55` confirme le message exact `'User already registered'` (celui de `supabase.auth.signUp`). Mais le flux réel de création de compte ici passe par `supabase.auth.updateUser({ email })` sur une session anonyme (upgrade), pas par `signUp` — le message Supabase renvoyé pour un e-mail déjà pris via ce chemin (`email_change`) peut différer (ex. `A user with this email address has already been registered`, code `email_exists`/`user_already_exists`). La correspondance est un **match exact sur une chaîne minuscule**, sans repli sur `error.code` : si le wording Supabase réel diverge, même légèrement, du texte codé en dur, le cas retombe silencieusement dans le fallback générique `account.errorNetwork` (« Pas de réseau ») — un utilisateur qui retente avec un e-mail déjà pris verrait un message trompeur. Non vérifiable sans un run réel contre Supabase (voir §4).

### 2.4 Mot de passe / identifiants invalides
- **Trigger** : `normalized.includes('invalid') || normalized.includes('password') || normalized.includes('mot de passe')` — `src/app/account.tsx:46`.
- **FR** : `account.errorWrongPassword` = `'E-mail ou mot de passe incorrect.'`
- **EN** : `account.errorWrongPassword` = `'Incorrect email or password.'`
- **Écran** : account (connexion, et théoriquement création si le message contient un de ces mots).
- **Notes/gaps** : sur-capture par construction — tout message contenant simplement le mot `password` (ex. un message de politique de mot de passe côté Supabase pendant une création `'Password should contain at least one character of each: ...'`) sera affiché comme « e-mail ou mot de passe incorrect », ce qui est **sémantiquement faux** en mode création (l'utilisateur n'a pas tapé le mauvais mot de passe, il a choisi un mot de passe trop faible — cas distinct de `reset.errorPassword` qui existe pour le flux reset mais n'a pas d'équivalent dans `account.*`). Le champ de création utilise déjà une contrainte client (`isPasswordLongEnough`, `MIN_PASSWORD_LENGTH = 6`, `src/components/account/PasswordField.tsx:17-21`) qui bloque le bouton avant soumission, donc ce cas Supabase-side est difficile à atteindre en pratique mais pas impossible (ex. règle de complexité serveur plus stricte que 6 caractères).

### 2.5 Upgrade e-mail indisponible (compte déjà permanent)
- **Trigger** : `requireAnonymousSession()` retourne `new AuthError('EMAIL_UPGRADE_UNAVAILABLE')` si la session courante n'est pas anonyme — `src/contexts/AuthContext.tsx:304-307`, consommé par `errorCopy()` (`normalized === 'email_upgrade_unavailable'`) — `src/app/account.tsx:42`.
- **FR** : `account.emailUpgradeUnavailable` = `'La création par e-mail est momentanément indisponible. Utilise Apple ou réessaie plus tard.'`
- **EN** : `account.emailUpgradeUnavailable` = `'Email account creation is temporarily unavailable. Use Apple or try again later.'`
- **Écran** : account (création).
- **Notes/gaps** : le wording FR/EN est correct mais **trompeur sur la cause réelle** — le message suggère un problème technique temporaire (« momentanément indisponible », « try again later ») alors que la cause réelle est structurelle : l'utilisateur a déjà un compte permanent et ne peut pas refaire un upgrade e-mail sur une session non-anonyme. « réessaie plus tard » ne résoudra jamais rien dans ce cas. Ce n'est pas un problème de code mais un problème de copy produit — signalé en Findings.

### 2.6 Erreur réseau / fallback générique (account)
- **Trigger** : dernier `return` de `errorCopy()`, `src/app/account.tsx:49` — capture tout le reste : vraies erreurs réseau (`isNetworkError()`, `AuthContext.tsx:17-23`) mais aussi n'importe quelle erreur Supabase non reconnue (ex. `User not found`, `Unexpected Supabase failure` — vérifié par le test `it.each` `src/app/account.test.tsx:66-80`).
- **FR** : `account.errorNetwork` = `'Pas de réseau. Réessaie dans un instant.'`
- **EN** : `account.errorNetwork` = `'No network. Try again in a moment.'`
- **Écran** : account (création + connexion), et Apple (`apple()`, `src/app/account.tsx:75-84`, qui réutilise `errorCopy()`).
- **Notes/gaps** : **finding majeur**. Le libellé affirme explicitement « pas de réseau » alors que le code ne vérifie jamais qu'il s'agit réellement d'un problème réseau à cet endroit — `errorCopy()` n'a aucune connaissance de `isNetworkError()` (qui existe pourtant dans `AuthContext.tsx` et est utilisé ailleurs pour peupler `authServiceUnavailable`). Toute erreur serveur inattendue (500, payload malformé, compte introuvable) affiche donc un message qui pointe l'utilisateur vers une cause (son réseau) qu'il ne peut pas corriger, et masque la vraie cause pour le diagnostic support. Le test `it.each` le confirme intentionnellement pour `'User not found'` et `'User account does not exist'` → `account.errorNetwork`, ce qui est un choix assumé de ne pas révéler qu'un compte a disparu côté serveur, mais le wording ne reflète pas ce choix.
- Ce même bucket absorbe aussi les erreurs internes codées en dur dans `AuthContext.tsx`, toutes en français uniquement, jamais passées par `i18n` : `'Service d\'authentification indisponible'` (`:164`, `:247`, `:263`, `:370`, `:485`), `'Sign in with Apple est indisponible sur cette plateforme'` (`:437`), `'Apple n\'a pas retourné de jeton d\'identité'` (`:456`). Comme elles finissent toutes dans le même fallback générique déjà localisé (`account.errorNetwork`), l'utilisateur ne voit jamais ces chaînes brutes — mais elles constituent un signal de dette : si un futur écran affichait `err.message` directement (au lieu de passer par `errorCopy()`), un utilisateur anglophone verrait du texte français brut.

### 2.7 Apple — annulation utilisateur
- **Trigger** : `error.code === 'ERR_REQUEST_CANCELED'` dans le `catch` de `signInWithApple()` — `src/contexts/AuthContext.tsx:473-481` — retourne `null` (pas d'erreur).
- **FR/EN** : aucun message (comportement correct — annuler ne doit pas afficher d'erreur).
- **Écran** : account.
- **Notes** : OK, comportement volontaire et correct.

### 2.8 Apple — plateforme non iOS
- **Trigger** : `if (Platform.OS !== 'ios') return new AuthError('Sign in with Apple est indisponible sur cette plateforme')` — `src/contexts/AuthContext.tsx:436-438`.
- **Notes/gaps** : **code mort confirmé**. Le bouton Apple n'est rendu que si `Platform.OS === 'ios'` (`AccountForm.tsx:29,40`), et `apple()` dans `account.tsx:76` fait déjà `if (Platform.OS !== 'ios') return;` avant même d'appeler `auth.signInWithApple()`. Cette branche d'`AuthContext` ne peut donc jamais être atteinte depuis l'UI actuelle. Message par ailleurs codé en dur en français, sans clé i18n.

### 2.9 Apple — pas de jeton d'identité
- **Trigger** : `if (!credential.identityToken) return new AuthError('Apple n\'a pas retourné de jeton d\'identité')` — `src/contexts/AuthContext.tsx:455-457`.
- **Notes/gaps** : remonté à `account.tsx` via `apple()` → `errorCopy(err.message)`. Le message ne contient ni `invalid`, ni `password`, ni `email_upgrade_unavailable`, ni `user already registered` → tombe dans le fallback `account.errorNetwork` (§2.6). Fonctionnellement acceptable (l'utilisateur voit un message générique plutôt qu'une chaîne technique), mais un cas Apple réellement récupérable (« réessaie ») affiche le même texte qu'une vraie coupure réseau.

### 2.10 Code OTP e-mail invalide/expiré (upgrade e-mail)
- **Trigger** : `completeEmailUpgrade()` retourne un `AuthError` (`AuthContext.tsx:391-407`) dont le message **n'est pas** `'EMAIL_UPGRADE_PROVISIONING_FAILED'` — traité dans `confirm()` : `if (err.message === 'EMAIL_UPGRADE_PROVISIONING_FAILED') setProvisioningError(true); else setCodeError(true);` — `src/app/verify.tsx:42-45`.
- **FR** : `verify.error` = `'Code incorrect ou expiré.'`
- **EN** : `verify.error` = `'Code incorrect or expired.'`
- **Écran** : verify.
- **Notes/gaps** : **sur-capture**, même pattern que §2.6. `completeEmailUpgrade()` peut échouer pour trois raisons distinctes en amont du provisioning : (a) session non anonyme (`EMAIL_UPGRADE_UNAVAILABLE`, `requireAnonymousSession()` ligne `AuthContext.tsx:396`), (b) `verifyOtp(..., type: 'email_change')` échoue — code réellement invalide/expiré, **ou erreur réseau pendant la vérification** (`runAuthOperation`, `AuthContext.tsx:399-402`), (c) `updateUser({ password })` échoue après un OTP valide. Les trois cas (a), (b)-réseau et (c) sont actuellement tous affichés comme « Code incorrect ou expiré », ce qui est faux pour (a) et pour la variante réseau de (b)/(c) — l'utilisateur retape un code correct en boucle sans que ça change quoi que ce soit à un problème réseau ou de session.

### 2.11 Provisioning du compte échoué après OTP validé
- **Trigger** : `err.message === 'EMAIL_UPGRADE_PROVISIONING_FAILED'`, renvoyé par `completeEmailUpgrade()` (`AuthContext.tsx:405-406`) quand `provisionCurrentPermanentSession()` échoue après un OTP + mot de passe valides — `src/app/verify.tsx:43`.
- **FR** : `verify.provisioningError` = `'Ton compte est créé, mais le service est momentanément indisponible. Réessaie dans un instant.'`
- **EN** : `verify.provisioningError` = `'Your account was created, but the service is temporarily unavailable. Please try again shortly.'`
- **Bouton associé** : `verify.retryProvisioning` = FR `'Réessayer'` / EN `'Try again'`.
- **Écran** : verify.
- **Notes** : wording précis et rassurant (« ton compte est créé »), FR/EN équivalents. OK.

### 2.12 Échec du retry de provisioning
- **Trigger** : `retryProvisioning()` — `src/app/verify.tsx:64-71` — appelle `auth.retryEmailUpgradeProvisioning()` ; si `err` est renvoyé, le code fait **`if (err) return;`** sans toucher à aucun état.
- **FR/EN** : **aucun message affiché**.
- **Écran** : verify.
- **Notes/gaps** : **gap critique**. Contrairement à `confirm()` qui distingue explicitement les échecs et met à jour l'état d'erreur, `retryProvisioning()` ne fait strictement rien en cas de nouvel échec — pas de `setProvisioningError`, pas de compteur, pas de message additionnel. L'écran reste figé sur le même texte `verify.provisioningError` affiché avant le clic, sans aucune indication que la tentative de retry a échoué. Un utilisateur peut cliquer « Réessayer » indéfiniment sans jamais savoir si quelque chose s'est passé. Notez aussi que `retryEmailUpgradeProvisioning()` (`AuthContext.tsx:419-433`) peut renvoyer `EMAIL_UPGRADE_PROVISIONING_UNAVAILABLE` (session redevenue absente/anonyme) — un cas encore plus sévère (compte non récupérable en l'état) qui reçoit exactement le même traitement (rien) que n'importe quel autre échec de retry.

### 2.13 Renvoi de code OTP e-mail échoué
- **Trigger** : `resendCode()` — `src/app/verify.tsx:50-62` — `const err = await auth.resendEmailUpgrade(...); if (err) { setResendError(i18n.t('verify.resendError')); return; }` (ligne 55).
- **FR** : **clé `verify.resendError` absente de `src/locales/fr.ts`** (confirmé par `grep -n "resendError" src/locales/fr.ts` → aucun résultat ; le bloc `verify` complet, `fr.ts:261`, ne contient pas cette clé).
- **EN** : **clé `verify.resendError` également absente de `src/locales/en.ts`** (même vérification, `en.ts:261`).
- **Écran** : verify.
- **Notes/gaps** : **gap critique, le plus grave de cet audit**. `i18n` est configuré avec `enableFallback = true` et `defaultLocale = 'fr'` (`src/utils/i18n.ts:8-9`), mais la clé n'existe dans **aucune** des deux locales — le fallback FR ne peut donc rien fournir. Le comportement par défaut de `i18n-js` pour une traduction manquante est de retourner une chaîne du type `[missing "fr.verify.resendError" translation]`, **affichée telle quelle à l'utilisateur** dans le bloc `accessibilityRole="alert"` (`verify.tsx:121-125`). Aucun test ne couvre ce chemin avec une assertion sur le texte affiché (`verify.test.tsx` vérifie seulement que `mockResend` est appelé avec les bons arguments, pas le rendu d'erreur), ce qui explique que ça n'ait pas été détecté. Impact : tout utilisateur dont le renvoi de code échoue (rate limit, réseau, etc.) voit une chaîne de debug interne au lieu d'un message compréhensible, dans les deux langues.

### 2.14 Rate limit sur renvoi de code OTP e-mail (upgrade)
- **Trigger** : `resendEmailUpgrade()` peut échouer avec une erreur satisfaisant `isRateLimitError()` (`AuthContext.tsx:25-35`, `status === 429` ou code `over_email_send_rate_limit` ou message contenant `rate limit`).
- **Notes/gaps** : contrairement à `reset.tsx`/`reset-confirm.tsx` qui appellent explicitement `isRateLimitError(err)` pour choisir entre `reset.errorRateLimit` et `reset.errorNetwork`, `verify.tsx` **n'importe pas `isRateLimitError`** et ne fait aucune distinction — tout échec de renvoi tombe dans le même `verify.resendError` (lui-même cassé, §2.13). Incohérence de traitement entre les deux flux OTP (upgrade e-mail vs reset mot de passe) qui partagent pourtant la même fonction `isRateLimitError` exportée pour ça.

### 2.15 Rate limit sur demande de reset mot de passe
- **Trigger** : `isRateLimitError(err)` vrai après `auth.requestPasswordReset(...)` — `src/app/reset.tsx:51`.
- **FR** : `reset.errorRateLimit` = `'Trop de demandes. Réessaie dans quelques minutes.'`
- **EN** : `reset.errorRateLimit` = `'Too many requests. Try again in a few minutes.'`
- **Écran** : reset (demande), réutilisé aussi dans `reset-confirm.tsx:92` pour le renvoi de code.
- **Notes** : cohérent FR/EN, testé (`reset.test.tsx:119-127`, `reset-confirm.test.tsx:301-308`). OK.

### 2.16 Erreur réseau / autre sur demande de reset
- **Trigger** : tout autre `err` après `requestPasswordReset()` — `src/app/reset.tsx:51` (branche `else`).
- **FR** : `reset.errorNetwork` = `"Pas de réseau ou trop de tentatives. Réessaie dans un instant."`
- **EN** : `reset.errorNetwork` = `'No network or too many attempts. Try again in a moment.'`
- **Écran** : reset (demande), reset-confirm (renvoi).
- **Notes** : contrairement à `account.errorNetwork` (§2.6), ce libellé est plus prudent — il ne prétend pas savoir la cause exacte (« pas de réseau **ou** trop de tentatives »), une formulation qui limite le risque de message trompeur. Bonne pratique à envisager de reporter sur `account.errorNetwork`. FR/EN cohérents.

### 2.17 Mot de passe trop faible à la confirmation reset
- **Trigger** : `message.includes('weak') || message.includes('password') || message.includes('at least')` — `src/app/reset-confirm.tsx:57`.
- **FR** : `reset.errorPassword` = `'Utilise au moins 8 caractères, avec une majuscule, une minuscule, un chiffre et un symbole.'`
- **EN** : `reset.errorPassword` = `'Use at least 8 characters, including uppercase, lowercase, a number, and a symbol.'`
- **Écran** : reset-confirm.
- **Notes/gaps** : FR/EN sémantiquement équivalents et précis. Incohérence produit à noter : ce message annonce une règle de complexité (8 caractères + majuscule + minuscule + chiffre + symbole) **plus stricte** que celle appliquée côté client sur l'écran de création de compte (`MIN_PASSWORD_LENGTH = 6`, aucune exigence de complexité, `PasswordField.tsx:17-21`) et sur ce même écran reset-confirm (`isPasswordLongEnough`, même règle de 6 caractères, `reset-confirm.tsx:33`). Le bouton de soumission de `reset-confirm` n'est déblocable qu'à partir de 6 caractères (`canSubmit`, ligne 33), donc un mot de passe de 6-7 caractères simples peut être soumis côté client puis rejeté côté serveur avec ce message qui réclame 8 caractères + complexité — le seuil client et le seuil serveur/message ne sont pas alignés.
- Le pattern `message.includes('password')` est aussi très large : il capterait par exemple un message Supabase qui parlerait du mot de passe pour une tout autre raison (ex. un message de politique générique non lié à la force) et l'afficherait quand même comme erreur de force — recouvrement possible avec §2.19 (le mot `password` n'apparaît pas dans les patterns de `errorCode`, donc pas de collision directe actuellement, mais fragile si les messages Supabase évoluent).

### 2.18 Code de reset invalide/expiré
- **Trigger** : `message.includes('token') || message.includes('otp') || message.includes('expired') || message.includes('invalid')` — `src/app/reset-confirm.tsx:59-64`.
- **FR** : `reset.errorCode` = `'Code incorrect ou expiré.'`
- **EN** : `reset.errorCode` = `'Incorrect or expired code.'`
- **Écran** : reset-confirm.
- **Notes/gaps** : identique au libellé `verify.error` (§2.10) — cohérence de ton, pas de doublon problématique puisque ce sont deux clés distinctes dans deux namespaces différents (normal, doc technique séparée par écran). Le pattern `message.includes('invalid')` est large et pourrait capter un message d'erreur générique contenant « invalid » sans rapport avec le code OTP (ex. « invalid request »), mais c'est cohérent avec le comportement équivalent déjà présent côté `account.errorWrongPassword` (§2.4) — un choix de design répété plutôt qu'une anomalie isolée.

### 2.19 Erreur réseau / autre sur confirmation reset
- **Trigger** : dernier `else` de `submit()` — `src/app/reset-confirm.tsx:67-69` — tout ce qui ne matche ni §2.17 ni §2.18.
- **FR/EN** : `reset.errorNetwork`, identique à §2.16.
- **Écran** : reset-confirm.
- **Notes/gaps** : le test `it.each` (`reset-confirm.test.tsx:244-259`) vérifie ce fallback avec trois messages, dont `'EMAIL_UPGRADE_PROVISIONING_FAILED'`. Or ce message ne peut **jamais** être produit par `completePasswordReset()` (`AuthContext.tsx:374-389`) — cette constante n'est renvoyée que par `completeEmailUpgrade()` et `retryEmailUpgradeProvisioning()`, deux fonctions du flux d'upgrade e-mail, jamais appelées depuis `reset-confirm.tsx`. Ce cas de test exerce donc une branche défensive qui ne peut pas se produire en production sur cet écran — inoffensif mais à signaler comme test surdimensionné / faux positif de couverture.

### 2.20 Rate limit / erreur sur renvoi de code reset
- **Trigger** : `resendCode()` — `src/app/reset-confirm.tsx:85-96` — même logique `isRateLimitError()` que §2.15/§2.16.
- **Écran** : reset-confirm.
- **Notes** : cohérent avec la demande initiale, testé. OK.

### 2.21 Synchronisation de la locale des e-mails (échec silencieux, volontaire)
- **Trigger** : `syncEmailLocale()` — `src/contexts/AuthContext.tsx:329-336` — `supabase.auth.updateUser({ data: { locale } })`, appelée avant `beginEmailUpgrade` et `resendEmailUpgrade` (upgrade e-mail uniquement). En cas d'échec, seul un `console.debug` conditionné par `DEBUG` est émis ; aucune erreur n'est propagée à l'appelant, l'opération continue.
- **FR/EN** : aucun message utilisateur (volontaire, documenté comme « best-effort » dans `docs/email.md` §« Email locale architecture »).
- **Notes** : comportement correct et documenté — la synchronisation de locale ne doit jamais bloquer l'envoi de l'e-mail. `requestPasswordReset()` ignore carrément son paramètre `_locale` (préfixé `_`, `AuthContext.tsx:347-349`) — cohérent avec `docs/email.md` qui indique que le template Reset Password reste volontairement français uniquement tant que `resetPasswordForEmail` ne supporte pas de métadonnées custom côté SDK mobile. Pas un gap : décision documentée et implémentation alignée.

---

## 3. Templates e-mail Supabase — cohérence avec `docs/email.md`

Résumé fidèle de `docs/email.md` (racine du repo, non ré-audité indépendamment — voir §4) :

- **`email_change` (upgrade e-mail invité → compte)** : doit utiliser `{{ .Token }}` (code à 6 chiffres), jamais `{{ .ConfirmationURL }}`. Le template documenté supporte déjà la bascule FR/EN via `{{ if eq .Data.locale "en" }}`, alimentée par `user_metadata.locale`. C'est exactement ce que prépare `syncEmailLocale()` avant `beginEmailUpgrade`/`resendEmailUpgrade` (§2.21) — cohérent entre code et doc.
- **`recovery` (Reset Password)** : template documenté comme **français uniquement**, sans conditionnelle `.Data.locale`, avec repli volontaire assumé tant que `resetPasswordForEmail(email)` ne prend pas de métadonnées côté SDK mobile. Cohérent avec le code : `requestPasswordReset()` ignore son paramètre `locale` (§2.21) et `reset.tsx`/`reset-confirm.tsx` n'appellent jamais `syncEmailLocale`.
- **`confirmation` (signup classique)** : non mentionné explicitement dans le flux actuel — le parcours de création de compte de l'app passe exclusivement par l'upgrade d'une session anonyme (`email_change`), pas par un `signUp` direct suivi d'une confirmation classique. `docs/email.md` ne documente pas de template `confirmation` séparé actif ; à confirmer côté Supabase Dashboard (non vérifiable depuis le code, voir §4).
- Prérequis Supabase documentés (Allow manual linking ON, Secure email change OFF, Mailer OTP length 6) sont cohérents avec l'usage de `verifyOtp({ email, token: code, type: 'email_change' })` (`AuthContext.tsx:400`) et `type: 'recovery'` (`AuthContext.tsx:381`) dans le code — un OTP à 6 chiffres est bien ce que `CodeInput`/`CODE_LENGTH = 6` attend des deux côtés (`verify.tsx:12`, `reset-confirm.tsx:14`).

Aucune incohérence relevée entre le code et ce que `docs/email.md` documente pour ces trois familles de templates.

---

## 4. Not covered / hors périmètre

- **Texte exact des erreurs Supabase en runtime** : l'audit s'appuie sur les messages utilisés dans les tests (`account.test.tsx`, `reset.test.tsx`, `reset-confirm.test.tsx`, `verify.test.tsx`) comme meilleure approximation documentée des messages réels, mais ces chaînes ne sont pas garanties identiques à ce que l'API Supabase Auth renvoie réellement en production (version SDK, wording peuvent changer). Le point le plus sensible est §2.3 (e-mail déjà pris via `updateUser`) — non vérifiable sans un test d'intégration contre un vrai projet Supabase.
- **Contenu réel des templates dans le Supabase Dashboard** : `docs/email.md` précise lui-même qu'il « ne contient pas de credentials ni ne revendique une configuration Dashboard qui n'a pas été vérifiée » — cet audit s'appuie donc sur la doc déclarée, pas sur une inspection directe du Dashboard.
- **`AccountGateContext.finishAccountCreation()`** (`src/contexts/AccountGateContext.tsx:74-104`) : en cas d'échec du replay d'une action en attente (ex. ajout d'un favori après création de compte), la fonction retourne `{ replayFailed: true }` en avalant l'exception dans un `catch {}` sans message utilisateur. `reset-confirm.tsx:77` teste ce flag pour rediriger vers `/(tabs)`, mais `account.tsx:36` (`complete()`) appelle `finishAccountCreation()` sans jamais lire son retour — incohérence de traitement entre les deux écrans qui appellent la même fonction. Ce n'est pas strictement un message d'erreur auth/e-mail (le flag ne pilote qu'une redirection), donc hors du périmètre strict demandé, mais signalé ici comme point connexe à vérifier.
- **Écran `survey.tsx`** : mentionné dans `fr.ts`/`en.ts` (`survey.error`) mais hors du périmètre auth/e-mail demandé (post-provisioning, pas un flux de connexion/e-mail) — non audité.
- **Comportement réel d'`i18n-js` pour une clé manquante** (format exact de la chaîne affichée pour §2.13) : déduit du comportement documenté par défaut de la librairie (`enableFallback` ne compense pas une absence totale de la clé dans les deux locales) plutôt que d'une exécution réelle de l'app — non exécuté dans ce contexte read-only.

---

## 5. Findings — classés par sévérité

### Critique
1. **`verify.resendError` — clé i18n absente de `fr.ts` ET `en.ts`** (§2.13). Tout échec de renvoi de code OTP e-mail affiche une chaîne de debug interne (`[missing "..." translation]`) à la place d'un message utilisateur, dans les deux langues. *Fix suggéré* : ajouter la clé dans les deux fichiers (ex. FR `"Impossible d'envoyer le code. Réessaie."`, EN `"Couldn't send the code. Try again."`), et ajouter un test qui rend réellement le texte affiché (pas seulement l'appel du mock) pour empêcher la régression.
2. **`retryProvisioning()` — échec de retry totalement silencieux** (§2.12). `verify.tsx:64-71` ignore la valeur de retour en cas d'erreur (`if (err) return;`), y compris le cas plus sévère `EMAIL_UPGRADE_PROVISIONING_UNAVAILABLE` (session redevenue anonyme/absente) qui reçoit le même traitement que n'importe quel échec temporaire. *Fix suggéré* : distinguer au minimum ces deux cas et donner un signal visible (compteur de tentatives, message mis à jour, ou redirection vers l'écran de connexion si la session n'est plus valide).

### Élevé
3. **Fallback générique `account.errorNetwork` trompeur** (§2.6). Le wording (« Pas de réseau ») est affirmatif sur une cause qui n'est jamais vérifiée à cet endroit (`errorCopy()` n'appelle jamais `isNetworkError()`), contrairement à `reset.errorNetwork`/`reset.errorPassword` qui restent plus prudents. Masque des erreurs serveur réelles (500, compte introuvable) derrière un message qui pointe le réseau de l'utilisateur. *Fix suggéré* : soit adoucir le wording (« Un problème est survenu. Réessaie. ») pour couvrir tous les cas sans mentir sur la cause, soit faire passer `errorCopy()` par `isNetworkError()`/le flag `authServiceUnavailable` pour distinguer réseau vs erreur serveur.
4. **`verify.error` sur-capture toute erreur, y compris réseau et session invalide** (§2.10). `confirm()` ne distingue que `EMAIL_UPGRADE_PROVISIONING_FAILED` du reste ; un échec réseau pendant `verifyOtp` ou une session redevenue non-anonyme (`EMAIL_UPGRADE_UNAVAILABLE`) affichent tous deux « Code incorrect ou expiré », poussant l'utilisateur à re-taper un code qui n'est pas le problème. *Fix suggéré* : que `completeEmailUpgrade()` distingue ces AuthError par un message/code dédié, et que `verify.tsx` les mappe séparément (au minimum réseau vs code invalide).
5. **Correspondance par chaîne exacte pour « e-mail déjà pris »** (§2.3), fragile face à un wording Supabase réel potentiellement différent de `'user already registered'` pour le flux `updateUser`/`email_change` réellement utilisé. *Fix suggéré* : vérifier le message exact retourné en environnement de dev réel, et si possible se reposer sur `error.code` (`user_already_exists`/`email_exists`) plutôt que sur le texte du message.

### Moyen
6. **Pas de distinction rate-limit sur le renvoi de code OTP e-mail (upgrade)**, contrairement au flux reset qui l'a (§2.14). Incohérence de traitement entre deux flux OTP très similaires qui partagent pourtant `isRateLimitError()`. *Fix suggéré* : appliquer la même logique dans `verify.tsx:resendCode()`.
7. **Seuils de robustesse du mot de passe incohérents entre client et message serveur** (§2.17) : validation client à 6 caractères sans exigence de complexité (`MIN_PASSWORD_LENGTH = 6`), message serveur qui réclame 8 caractères + majuscule/minuscule/chiffre/symbole. Un mot de passe accepté côté client peut être rejeté côté serveur avec un message qui semble incohérent avec ce que l'UI a laissé passer. *Fix suggéré* : aligner `MIN_PASSWORD_LENGTH`/règles client sur la politique serveur réelle, ou afficher les règles de complexité dès la saisie (le composant `PasswordField` a déjà un indicateur de force, `passwordStrength()`, qui pourrait porter ces règles).
8. **Copy « momentanément indisponible » pour un cas structurel** (§2.5, `account.emailUpgradeUnavailable`) : le message suggère de réessayer plus tard un cas qui ne se résoudra jamais par une nouvelle tentative (compte déjà permanent). *Fix suggéré* : reformuler pour orienter vers la connexion plutôt que vers un nouvel essai.
9. **Risque futur — `Confirm email` sera réactivé avant la release 1.0.0** (note `CLAUDE.md` racine, section « Avant Release 1.0.0 »). Aucun des patterns de `errorCopy()` (`account.tsx:40-50`) ne reconnaît un message du type « Email not confirmed » — ce cas retomberait dans le fallback trompeur `account.errorNetwork` (finding #3) le jour où cette option Supabase sera réactivée. *Fix suggéré* : anticiper ce cas avec une clé et un pattern dédiés avant la réactivation.

### Faible
10. **Namespace `auth.emptyFields` partagé** par `account.tsx` et `reset.tsx` (§2.1) plutôt qu'une clé par namespace (`account.emptyFields`/`reset.emptyFields`) — cohérent avec le reste du fichier `auth.*` qui semble être un vestige d'un écran de connexion plus ancien (comparer les clés `auth.login`/`auth.signup`/`auth.noAccount` à `account.login`/`account.create`/`account.noAccount`, quasi doublons). Pas un bug utilisateur, mais un signal de duplication de namespace i18n à nettoyer.
11. **Validation e-mail client absente sur `account.tsx`** alors qu'elle existe sur `reset.tsx` (`reset.errorEmail`, §2.2) — incohérence mineure entre les deux écrans de saisie d'e-mail.
12. **Test `EMAIL_UPGRADE_PROVISIONING_FAILED` sur `reset-confirm.tsx`** (§2.19) exerce une branche qui ne peut pas se produire en production sur cet écran (cette constante n'est jamais renvoyée par `completePasswordReset()`) — faux positif de couverture, sans impact utilisateur, mais à corriger pour ne pas donner une fausse confiance sur ce test.
13. **Messages `AuthError` internes codés en dur en français** dans `AuthContext.tsx` (`'Service d\'authentification indisponible'`, etc., §2.6) — jamais montrés tels quels aujourd'hui car toujours absorbés par un fallback déjà localisé, mais à surveiller si un futur écran affichait `err.message` directement sans repasser par une fonction de mapping i18n.

---

## 6. Récapitulatif chiffré

- **22 cas d'erreur distincts** catalogués (tableau §1 / détail §2).
- **2 gaps critiques** (clé i18n manquante, feedback silencieux sur échec de retry).
- **3 gaps de sévérité élevée** (fallback trompeur, sur-capture verify.error, matching fragile e-mail déjà pris).
- **4 gaps de sévérité moyenne**, **4 de sévérité faible**.
- Pairs FR/EN vérifiés **présents et sémantiquement équivalents** pour tous les cas sauf `verify.resendError` (absent des deux locales).
