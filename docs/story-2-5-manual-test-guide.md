# Story 2.5 — Guide de test manuel (parcours compte différé)

> Le parcours e-mail est **raccordé** depuis le 2026-09-06 (`beginEmailUpgrade` /
> `completeEmailUpgrade` / `resendEmailUpgrade` appellent réellement Supabase).
> Ce guide sert à le valider sur l'instance Supabase de dev + le backend dev qui tourne.

---

## 0. Prérequis

- **Backend dev** en ligne (`dev-api.cloudbreak-app.com`) ou local (`make dev`).
- **Rebuild natif** obligatoire (nouveaux modules `expo-secure-store` + `expo-apple-authentication`) :
  ```bash
  cd mobile
  npx expo run:ios
  ```
- Simulateur iOS neuf conseillé (Effacer contenu et réglages) pour repartir d'un onboarding vierge.

---

## 1. Réglages dashboard Supabase (projet dev) — à faire une fois

Authentication → **Providers → Anonymous** : `Allow anonymous sign-ins` = **ON** *(déjà fait le 2026-09-06)*.

Authentication → **Providers → Email** :
- [ ] `Confirm email` = **ON**
- [ ] `Secure email change` = **OFF** *(l'utilisateur anonyme n'a pas d'ancienne adresse : sinon Supabase attend une double confirmation impossible)*

Authentication → **Email Templates → « Confirm signup »** *(ou « Change Email Address » selon le template déclenché — les deux peuvent l'être, mettre le token dans les deux)* :
- [ ] Remplacer le lien par le **code** : le corps doit contenir `{{ .Token }}` (code à 6 chiffres), pas seulement `{{ .ConfirmationURL }}`.

> Le mailer intégré Supabase suffit pour tester (aucun SMTP à configurer). Limite : ~2–4 e-mails/heure.
> Pas de `service_role` key dans ce fichier ni dans les logs.

Sonde de config (lecture seule, ne crée rien) :
```bash
cd mobile
node - <<'NODE'
const fs = require('fs');
const c = fs.readFileSync('app.config.ts', 'utf8');
const url = process.env.SUPABASE_URL ?? c.match(/supabaseUrl:\s*process\.env\.SUPABASE_URL \?\? '([^']+)'/)[1];
const key = process.env.SUPABASE_KEY ?? c.match(/supabaseKey:\s*process\.env\.SUPABASE_KEY \?\? '([^']+)'/)[1];
(async () => {
  const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
  const b = await r.json();
  console.log(JSON.stringify({ status: r.status, anonymous_users: b.external?.anonymous_users,
    apple: b.external?.apple, email: b.external?.email, mailer_autoconfirm: b.mailer_autoconfirm }));
})();
NODE
```
Attendu : `anonymous_users: true`, `email: true`, `mailer_autoconfirm: false`.

---

## 2. Parcours invité (aucun compte — le cœur du lot)

1. Lancer l'app, faire l'onboarding → arrivée sur **Home en mode invité** (pas d'écran de login).
2. Chercher un sommet, ouvrir un score → **le score s'affiche sans compte**. ✅
3. Consulter un 1ᵉʳ score (quota gratuit du jour).
4. Ouvrir un **2ᵉ** sommet différent le même jour → l'**écran compte** s'affiche. Appuyer sur le chevron ‹ → retour en invité, **aucune pénalité**.
5. Sur n'importe quel sommet, « Ajouter aux favoris » en invité → l'écran compte s'affiche.
6. Onglet **Profil** en invité → carte « invité », **pas** de bouton Se déconnecter / Supprimer.

---

## 3. Création de compte par e-mail → mini-sondage

1. Depuis le mur (2ᵉ check ou favori), écran compte → onglet **Créer un compte**.
2. Saisir une adresse **réelle** que tu peux consulter + un mot de passe.
3. Valider → écran **/verify** (6 cases).
4. Relever discrètement (console debug `[AuthContext] auth state change`) le `user.id` **avant** validation.
5. Ouvrir l'e-mail reçu → **doit contenir un code à 6 chiffres** (pas seulement un lien). Le saisir.
   - Si erreur « Token/type invalide » : le type OTP `email_change` n'est pas celui de l'instance → me le dire, on bascule sur `signup`. C'est le seul point réellement incertain.
6. Après validation → écran **mini-sondage** (2 questions + case newsletter), skippable.
7. Vérifier :
   - [ ] `user.id` **identique** avant / après (même UUID, `is_anonymous` passe à `false`)
   - [ ] le quota du jour n'est **pas** remis à zéro
   - [ ] en base backend : une ligne `users` avec ce `supabase_user_id` (via `GET /api/v1/user/me` → `provisioned: true`)
8. Cas d'erreur :
   - [ ] Code erroné → message d'erreur, compte **non** converti
   - [ ] « Renvoyer le code » → nouvel e-mail reçu
   - [ ] Adresse déjà utilisée → erreur produit, pas de 2ᵉ identité, session invitée préservée

---

## 4. Connexion à un compte existant (pas de sondage)

1. Se déconnecter (Profil → Se déconnecter) → retour Home en invité.
2. Écran compte → onglet **Se connecter** → e-mail + mot de passe du compte créé en §3.
3. Vérifier : connexion directe, **pas** d'écran /verify, **pas** de mini-sondage, l'action en attente (favori) est rejouée.

---

## 5. Retrait du consentement newsletter (RGPD)

1. Compte permanent, onglet **Profil → section Compte → ligne « Newsletter »**.
2. Basculer → la valeur change **immédiatement** (optimiste) et un `PATCH /api/v1/user/preferences` part (network logs).
3. Couper le réseau, rebasculer → le toggle **revient** à son état précédent (rollback).
4. Rallumer le réseau, `GET /api/v1/user/me` → `newsletter_opt_in` reflète le dernier choix.

---

## 6. Session persistée dans le Keychain

1. Se connecter (e-mail ou Apple).
2. **Tuer l'app** (swipe up) puis la relancer → toujours connecté, **pas** de re-login.
3. (optionnel) Sur un build qui avait déjà une session en AsyncStorage : au 1ᵉʳ lancement post-update, la session est **migrée** sans re-login.

---

## 🔴 Bloqué par le compte Apple Developer payant (99 €/an)

Ces points ne sont **pas testables** tant que le compte Apple Developer n'est pas pris — la
capability « Sign in with Apple » exige une adhésion payante pour un provisioning profile réel :

- **§ Sign in with Apple** : provider Supabase Apple + Service ID / Key / Team ID, capability dans la build.
  - Création Apple → lie l'identité à la session anonyme, garde l'UUID, va au mini-sondage.
  - Connexion Apple → reconnecte sans /verify ni sondage.
  - Annulation Apple → ne détruit pas la session invitée.
- **Universal Links / deep link de partage** (`apple-app-site-association` + `associatedDomains`).

Le reste du lot (invité, e-mail, newsletter, Keychain) se teste **sans** compte Apple.
