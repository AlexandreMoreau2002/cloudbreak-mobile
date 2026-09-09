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

1. `requestPasswordReset(email, locale)` tente de synchroniser la locale, puis appelle
   `supabase.auth.resetPasswordForEmail(email)`.
2. Le template Supabase « Reset Password » montre `{{ .Token }}`, un OTP de six chiffres.
3. `completePasswordReset(email, code, newPassword)` appelle
   `verifyOtp({ email, token: code, type: 'recovery' })`.
4. La vérification crée une session recovery authentifiée. L'app peut alors appeler
   `updateUser({ password: newPassword })`.
5. L'app relit la session permanente et appelle le provisioning Cloudbreak existant. Si le
   parcours avait commencé pour ajouter un favori ou dépasser un quota, l'action est rejouée ;
   sinon l'utilisateur revient aux onglets.

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

Le cooldown de 30 secondes limite l'usage normal du renvoi, mais ce n'est pas une protection de
sécurité serveur : les limites Supabase et, avant production, un CAPTCHA doivent protéger
l'endpoint contre les scripts et les changements d'appareil.

## Anti-énumération

Après une demande acceptée, l'app affiche toujours : « Si un compte existe pour cette adresse, un
code vient d'être envoyé. » Elle ne confirme jamais qu'une adresse est inscrite. Les erreurs réseau
et rate-limit partagent aussi une copie générique.

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

Le `else` français couvre les locales absentes ou invalides et les cas où la synchronisation
best-effort échoue. La configuration hébergée reste une action opérateur ; le dépôt ne contient ni
credentials SMTP ni copie de secret.

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
