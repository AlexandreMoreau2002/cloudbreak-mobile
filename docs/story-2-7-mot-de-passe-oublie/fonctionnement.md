# Mot de passe oublié — fonctionnement

## L'idée simple

Un mot de passe ne peut pas être « retrouvé » : ni Cloudbreak ni Supabase ne doivent le connaître
en clair. L'utilisateur prouve plutôt qu'il contrôle son adresse e-mail grâce à un code temporaire,
puis choisit un nouveau mot de passe.

Dans cette story, Supabase s'occupe de l'identité et de l'e-mail. Le backend Cloudbreak ne reçoit
ni le code ni le nouveau mot de passe et n'expose aucun nouvel endpoint.

## Le parcours, comme une chaîne de quatre portes

```text
PORTE 1                 PORTE 2                 PORTE 3              PORTE 4
Demander le code        Prouver l'e-mail        Changer le secret     Raccorder le compte

/reset                  /reset-confirm          Supabase Auth         Cloudbreak existant
   |                         |                       |                      |
   | resetPasswordForEmail  | verifyOtp recovery   | updateUser password | provisioning
   v                         v                       v                      v
e-mail avec OTP --------> session recovery ------> nouveau mot de passe -> app / action attente
```

Chaque porte ne s'ouvre que si la précédente a réussi :

1. `requestPasswordReset(email, locale)` appelle directement
   `supabase.auth.resetPasswordForEmail(email)`. Le flux OTP n'a pas besoin de `redirectTo`.
2. Le template Supabase « Reset Password » montre `{{ .Token }}`, un OTP de six chiffres.
3. `completePasswordReset(email, code, newPassword)` appelle
   `verifyOtp({ email, token: code, type: 'recovery' })`.
4. La vérification crée une session recovery authentifiée. L'app peut alors appeler
   `updateUser({ password: newPassword })`.
5. L'app relit la session permanente et appelle le provisioning Cloudbreak existant. Si le
   parcours avait commencé pour ajouter un favori ou dépasser un quota, l'action est rejouée ;
   sinon l'utilisateur revient aux onglets. Le gate renvoie un résultat contrôlé si ce replay
   échoue : `/reset-confirm` retourne alors sur Home et libère le formulaire, sans capturer
   l'exception métier dans l'écran.

La demande de récupération ne synchronise pas la locale de l'app avec Supabase : elle cible un
compte par son e-mail, tandis que `updateUser({ data: { locale } })` ne peut modifier que la
session active. Lors d'une session invitée, cette écriture inutile peut émettre `USER_UPDATED`, puis
faire réagir le listener d'authentification et donner l'impression d'un rechargement. La locale
passée à `requestPasswordReset` est temporairement conservée pour compatibilité avec l'écran
existant mais ignorée intentionnellement. La synchronisation de locale demeure réservée à la
conversion e-mail du compte connecté.

## Ce que voit l'utilisateur

```text
Connexion
  └─ Mot de passe oublié ?
       └─ /reset : e-mail
            ├─ erreur locale : vide / format invalide
            ├─ erreur distante : message générique
            └─ succès
                 └─ /reset-confirm?sent=1
                      ├─ message neutre anti-énumération
                      ├─ cooldown initial : 30 s
                      ├─ code faux/expiré : rester sur place
                      ├─ mot de passe < 8 : bouton bloqué
                      ├─ renvoi réussi : cooldown 30 s
                      ├─ renvoi échoué : erreur, pas de cooldown
                      └─ succès : action en attente ou Home
```

## Protections contre les gestes répétés

L'état `loading` désactive les boutons, mais une mise à jour React n'est pas instantanée. Les
références `submitInFlight` et `resendInFlight` ferment donc la porte dès le premier tap, avant le
premier `await`. Cela empêche deux vérifications ou deux e-mails quand l'utilisateur tape deux fois
très vite.

Le premier envoi déclenche un cooldown de 30 secondes dès l'arrivée sur la confirmation. Un renvoi
réussi le redémarre ; un renvoi échoué ne crée pas de nouveau cooldown local. Supabase applique
cependant sa propre fenêtre à `/auth/v1/recover` : elle vaut 60 secondes par défaut et est
personnalisable dans **Authentication → Rate Limits → Password reset request**. Cloudbreak doit la
régler à **30 secondes maximum** pour aligner le serveur sur l'interface. Référence :
[Rate limits — Supabase Auth](https://supabase.com/docs/guides/auth/rate-limits).

Ces 30 secondes limitent l'usage normal, mais ne remplacent pas la protection serveur. Les limites
Supabase et, avant production, un CAPTCHA doivent protéger l'endpoint contre les scripts et les
changements d'appareil.

## Anti-énumération

Après une demande acceptée, l'app affiche toujours : « Si un compte existe pour cette adresse, un
code vient d'être envoyé. » Elle ne confirme jamais qu'une adresse est inscrite. Les erreurs réseau
restent génériques ; un `429`, `over_email_send_rate_limit` ou message de rate limit reçoit une
copie dédiée qui invite à attendre.

Cette neutralité d'interface ne suffit pas à elle seule. L'opérateur doit vérifier que Supabase
répond de manière indifférenciable pour une adresse connue et inconnue et surveiller les écarts de
temps, les quotas et les journaux de livraison sans y copier d'OTP.

## Langue des e-mails

L'app contient les copies d'écran FR et EN. `i18n.defaultLocale = 'fr'` et le fallback est actif.
Le Dashboard Supabase doit appliquer le même contrat au template « Reset Password » :

```html
{{ if eq .Data.locale "en" }}
<p>Enter this 6-digit code in Cloudbreak:</p>
{{ else }}
<p>Entre ce code à 6 chiffres dans Cloudbreak :</p>
{{ end }}
<p><strong>{{ .Token }}</strong></p>
```

Le `else` français couvre les locales absentes ou invalides. Pour une récupération, `.Data.locale`
est la métadonnée du compte qui reçoit l'e-mail : la langue actuellement sélectionnée dans un
client non authentifié ne garantit pas la langue du message. La validation doit donc employer un
compte contrôlé avec `user_metadata.locale = 'fr'`, un autre avec `user_metadata.locale = 'en'`,
puis un compte avec valeur absente ou invalide pour le fallback FR.

La synchronisation de locale par l'app est best-effort. Si le produit exige plus tard que chaque
e-mail suive exactement la locale pré-auth courante, il faudra un mécanisme transactionnel dédié ;
c'est un gap futur, pas une promesse de ce flow Supabase. La configuration hébergée reste une
action opérateur et le dépôt ne contient ni credentials SMTP ni copie de secret.

## Livraison et diagnostic opérateur

Le Dashboard Supabase doit utiliser le template **Authentication → Email Templates → Reset
Password** avec `{{ .Token }}`. Le parcours ne consomme pas `{{ .ConfirmationURL }}` et n'envoie
pas de `redirectTo` : le code est vérifié dans l'app avec `verifyOtp({ type: 'recovery' })`.

Tester avec un compte confirmé quand **Confirm email** est activé. Les limites e-mail et le
cooldown de récupération peuvent bloquer un essai après des envois signup/récupération récents
(souvent environ 2 à 4 e-mails par heure, selon la configuration). En cas de non-réception,
contrôler **Authentication → Logs**, filtrer `recovery` et le compte de test dans le Dashboard ; le
log DEBUG mobile se limite à `{ hasError, code, status }`, sans adresse, OTP, mot de passe ni jeton.

## Écart documenté avec l'epic

Les AC provisoires de l'epic parlent encore d'un lien de réinitialisation. La spec validée a choisi
l'OTP in-app pour éviter un deep link de récupération. Le résultat métier ne change pas : l'e-mail
prouve la possession de l'adresse et autorise le remplacement du mot de passe.

## Fichiers impactés

```text
src/app/account.tsx
  └─ ouvre src/app/reset.tsx
       └─ AuthContext.requestPasswordReset()
            └─ Supabase /auth/v1/recover

src/app/reset-confirm.tsx
  └─ AuthContext.completePasswordReset()
       ├─ Supabase /auth/v1/verify (recovery)
       ├─ Supabase /auth/v1/user (password)
       └─ provisioning Cloudbreak déjà existant

src/components/account/
  ├─ AccountForm.tsx
  └─ PasswordField.tsx

src/locales/
  ├─ fr.ts
  └─ en.ts
```
