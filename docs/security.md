# Security — Mobile

Ce fichier est maintenu automatiquement par l'agent `cloudbreak-security`.
Chaque entrée est horodatée et liée à la story qui l'a générée.

---

## 2026-09-11 Story 2-5/2-6/2-8 — Retrait du blocage client sur la force du mot de passe

Commits `0668abb..ac2c21b` — `isPasswordEligible` (4 critères) remplacé par `isPasswordLongEnough`
(plancher 6 caractères) dans `PasswordField.tsx`, `AccountForm.tsx`, `reset-confirm.tsx`.

### 🔵 INFO
- **[PasswordField.tsx]** La modification est strictement côté client. La politique de mot de passe
  réelle est appliquée par Supabase Auth côté serveur (minimum 6 caractères, non configurable en
  dessous). Un attaquant contournant l'app mobile atteignait déjà Supabase directement — le gate
  client n'a jamais été une barrière de sécurité, seulement un filtre UX. Aucune régression de
  sécurité réelle.
- **[reset-confirm.tsx:53-61]** Le handler d'erreur de `completePasswordReset` intercepte
  correctement un refus de Supabase sur la politique de mot de passe :
  `message.includes('weak') || message.includes('password') || message.includes('at least')` →
  `i18n.t('reset.errorPassword')`. Conforme pour le flux de réinitialisation.
- **[Pas de log sensible]** Le seul `console.debug` ajouté dans `reset-confirm.tsx` loggue
  `{ codeLength: code.length }` — jamais la valeur du mot de passe, du code OTP, ni du token.

### 🟡 WARNING
- **[verify.tsx:42-48 — existant, aggravé]** Dans le flux de création de compte,
  `completeEmailUpgrade(email, password, code)` est appelé dans `verify.tsx`. Si Supabase rejette
  le mot de passe (politique Dashboard plus stricte que 6 caractères), l'erreur tombe dans le bloc
  `else setCodeError(true)` — affiché à l'utilisateur comme une erreur de code OTP, non comme une
  erreur de mot de passe. Avant ce PR, le gate 4/4 critères client réduisait fortement la
  probabilité d'atteindre ce cas ; désormais, des mots de passe de 6-7 caractères sans complexité
  passent le filtre client et peuvent échouer côté Supabase si une politique non-défaut est
  configurée. **À corriger avant de durcir la politique Supabase** : ajouter une détection par
  mots-clés (`weak`, `password`, `at least`) dans le handler d'erreur de `verify.tsx` sur le même
  modèle que `reset-confirm.tsx`, pour afficher un message de mot de passe plutôt que de code OTP.

### Verdict
CORRECTIONS RECOMMANDÉES — aucun blocage de merge (la politique Supabase par défaut est exactement
6 caractères, le cas ne se déclenche pas avec la configuration actuelle). Corriger `verify.tsx`
avant tout durcissement de la politique Dashboard Supabase.

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

### 🟢 RÉSOLU (dans la même branche)
- **[secureSessionStorage.ts]** `setItem` purge désormais AsyncStorage (`await AsyncStorage.removeItem(key)`) après `writeChunked`, en plus du chemin de migration de `getItem`. Un résidu de token en clair laissé par un crash pendant la migration est effacé au prochain rafraîchissement de session, plus seulement à la déconnexion.

### 🔵 INFO
- **[useNewsletterConsent / api/user.ts]** Le consentement newsletter est lu via
  `GET /api/v1/user/me` et modifié via `PATCH /api/v1/user/preferences` (compte permanent
  requis, `403 ACCOUNT_REQUIRED` sinon). Aucune donnée personnelle nouvelle stockée sur
  l'appareil ; le booléen transite en HTTPS, jamais loggé (seul `if (DEBUG) console.debug`).
- **[RGPD]** Le retrait de consentement est aussi simple que l'octroi (une bascule dans
  Profil → Compte → Newsletter), conforme à l'art. 7-3.
- **[secureSessionStorage.ts — migration path]** La logique de migration lit d'abord le Keychain (`readChunked`), puis AsyncStorage seulement si le Keychain est vide. Un crash après `writeChunked` mais avant `AsyncStorage.removeItem` laisse le Keychain valide : au redémarrage, `readChunked` retourne les données du Keychain et la migration n'est pas ré-exécutée — pas de boucle, pas de perte de session. La purge d'un résidu AsyncStorage est garantie par `setItem` (voir RÉSOLU ci-dessus).
- **[supabaseClient.ts:8]** `detectSessionInUrl: false` — désactivé, conforme à un contexte mobile sans deep-link auth. Aucune session ne peut être injectée via URL.

---

## 2026-09-09 Story 2.7 — Récupération du mot de passe par OTP

### 🟢 PROTECTIONS EN PLACE

- **[Anti-énumération]** Après une demande acceptée, `/reset-confirm` affiche uniquement « Si un
  compte existe pour cette adresse… ». La route ne reçoit `sent=1` qu'après la réussite de
  `resetPasswordForEmail`; les échecs réseau et rate-limit utilisent une copie générique.
- **[Secrets et logs]** L'adresse complète, l'OTP, le nouveau mot de passe, l'access token et le
  refresh token ne sont jamais loggés. Les traces DEBUG se limitent à `hasEmail`, `codeLength` et
  aux étapes/résultats catégorisés. Aucun de ces secrets ne transite par le backend Cloudbreak.
- **[Doubles taps]** `submitInFlight` et `resendInFlight` verrouillent synchroniquement les appels,
  en complément des boutons désactivés. Deux taps immédiats ne lancent qu'une opération.
- **[Transport et stockage]** Les appels recovery vont directement à Supabase Auth en HTTPS. La
  session issue de `verifyOtp(type: 'recovery')` utilise l'adaptateur SecureStore/Keychain existant.
- **[Pas de deep link recovery]** `detectSessionInUrl: false` reste actif. Le template doit exposer
  `{{ .Token }}` ; aucune session n'est injectée depuis un lien entrant.

### 🟡 RISQUES À TRAITER / VALIDER AVANT PRODUCTION

- **[Rate-limit]** Supabase documente pour `/recover` une fenêtre personnalisable de 60 secondes
  par défaut. La décision Cloudbreak est de régler **Authentication → Rate Limits → Password reset
  request** à 30 secondes maximum, en cohérence avec le cooldown initial et les cooldowns de renvoi
  de l'app. Cette protection UX se contourne avec un client modifié ou un nouvel appareil : tester
  la limite serveur, surveiller les abus et évaluer un CAPTCHA.
- **[Anti-énumération côté fournisseur]** La copie mobile est neutre, mais il reste à mesurer les
  réponses et timings Supabase pour adresses connues/inconnues. Les journaux opérateur peuvent
  distinguer la livraison, mais ne doivent pas exposer d'OTP ni être accessibles au client.
- **[Session recovery]** `verifyOtp` établit et persiste une session authentifiée avant
  `updateUser({ password })`. Si l'écriture du mot de passe ou le provisioning échoue, la session
  peut déjà exister dans le Keychain tandis que l'écran reste ouvert. Tester interruption,
  redémarrage et retry ; confirmer les droits RLS/backend de cette session et décider si un échec
  terminal doit forcer une déconnexion avant la release.
- **[Template et locale]** Configurer dans le Dashboard Supabase le template **Reset Password**
  avec `{{ .Token }}`, variantes FR/EN via `.Data.locale` et branche française par défaut. Cette
  valeur vient des `user_metadata` du compte destinataire : la locale courante du client pré-auth
  ne garantit pas la langue du message. Les preuves exigent des comptes contrôlés préconfigurés
  `fr`, `en`, puis absent/invalide pour le fallback FR. Une correspondance exacte avec la locale
  pré-auth demanderait plus tard un mécanisme d'e-mail transactionnel dédié.
- **[Politique mot de passe]** (mise à jour 2026-09-11) L'app ne bloque plus que les valeurs sous
  **six** caractères — le blocage client sur les 4 critères de force (majuscule+minuscule, chiffre,
  caractère spécial) a été retiré ; la jauge de force (`passwordStrength`) reste affichée mais est
  purement informative, sans conséquence sur le submit. Le plancher de 6 caractères est aligné sur
  le minimum dur de Supabase Auth (non configurable en dessous) : Supabase reste l'autorité finale.
  Vérifier que sa politique de complexité (Dashboard → Authentication → Policies) et les messages
  d'erreur retournés correspondent à la copie produit, sans relâcher la règle côté fournisseur.

### Verdict

CODE MOBILE PRÊT POUR VALIDATION RÉELLE — aucun secret ajouté et aucune surface backend
Cloudbreak créée. Le merge production reste conditionné par le template hébergé, les tests de
livraison/anti-énumération, les limites Supabase et le comportement d'une session recovery
interrompue.

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

---

## 2026-09-12 Durcissement post-merge auth

### 🔵 INFO
- **[src/services/fetchService.ts]** Le timeout HTTP (`Promise.race` entre `fetch()` et un timer 10s) n'abortait pas réellement la requête sous-jacente si le timer gagnait la course — le `fetch()` continuait en arrière-plan. Corrigé : un `AbortController` interne est créé à chaque appel, écoute un `signal` externe optionnel (annulation propagée), et `controller.abort()` est appelé dans le callback du timeout avant de rejeter. Le listener externe est retiré (`removeEventListener`) dans le `finally` pour éviter toute fuite si un signal est réutilisé.
- **[src/services/supabaseClient.ts]** Le client Supabase lisait `Constants.expoConfig?.extra?.{supabaseUrl,supabaseKey}` sans vérification (`as string`). Un profil de build EAS mal configuré aurait échoué de façon opaque plus tard (dans `createClient()` ou au premier appel réseau). Corrigé : `throw` explicite au chargement du module si l'une des deux valeurs est absente, avec un message pointant vers la cause probable (profil EAS).
- **[src/app/verify.tsx, src/app/account.tsx, src/contexts/AuthContext.tsx]** Si `signIn()`/`signInWithApple()`/`completeEmailUpgrade()` réussissait côté Supabase mais que le provisioning backend échouait, l'utilisateur était déjà authentifié mais pas provisionné en DB — `account.tsx` affichait un message générique sans retry. Ajout d'un état `provisioningError` distinct + bouton retry sur les deux écrans (login e-mail, Apple, création e-mail), réutilisant `AuthContext.retryProvisioning()` (renommé depuis `retryEmailUpgradeProvisioning`, la fonction étant déjà générique). Détection factorisée dans `isProvisioningError()` exportée par `AuthContext.tsx`, utilisée identiquement par les deux écrans. `verify.tsx` redirige désormais vers `/account` si l'écran est ouvert sans email/password en mémoire (ex : app tuée en plein flow).

### Verdict
SECURE — aucune nouvelle surface de données exposée. Ces corrections sont de la robustesse réseau/UX et une garde de configuration, pas des changements de flux d'authentification. Le retry provisioning ne contourne aucune vérification serveur : il rappelle exactement le même provisioning que le chemin nominal.
