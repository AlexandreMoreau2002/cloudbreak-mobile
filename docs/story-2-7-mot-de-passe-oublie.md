# Story 2.7 — Mot de passe oublié

## Résultat

Le parcours de récupération est présent entièrement dans l'application mobile. Depuis le mode
connexion, « Mot de passe oublié ? » ouvre `/reset`. L'utilisateur demande un code à six chiffres,
le saisit dans `/reset-confirm`, choisit un mot de passe d'au moins huit caractères, puis retrouve
sa session et son action en attente éventuelle.

Le parcours utilise directement **Supabase Auth**. Aucun endpoint et aucun changement du backend
Cloudbreak n'ont été ajoutés.

## Fichiers et rôles

| Fichier | Rôle |
|---|---|
| `src/components/account/PasswordField.tsx` | Champ de mot de passe réutilisable, affichage/masquage et indicateur de robustesse. |
| `src/components/account/AccountForm.tsx` | Affiche « Mot de passe oublié ? » uniquement en mode connexion. |
| `src/app/account.tsx` | Ouvre `/reset` depuis le formulaire de connexion. |
| `src/app/reset.tsx` | Valide l'e-mail, demande le code et transmet `email` + `sent=1` à la confirmation. |
| `src/app/reset-confirm.tsx` | Saisit le code et le nouveau mot de passe, gère le renvoi, les erreurs et le retour dans l'app. |
| `src/contexts/AuthContext.tsx` | Orchestre `resetPasswordForEmail`, `verifyOtp`, `updateUser` et le provisioning. |
| `src/locales/fr.ts`, `src/locales/en.ts` | Fournissent toutes les copies du parcours en français et en anglais. |
| `src/utils/i18n.ts` | Active le fallback et définit le français comme langue de repli. |
| Tests `*.test.tsx` associés | Couvrent validations, erreurs, navigation, cooldown, provisioning et doubles taps. |

## Comment ça marche

```text
Connexion
   |
   | « Mot de passe oublié ? »
   v
/reset -- e-mail --> resetPasswordForEmail(email)
   |                         |
   | succès                  +--> Supabase envoie le template « Reset Password »
   v                              contenant {{ .Token }}
/reset-confirm?email=...&sent=1
   |  message neutre : « Si un compte existe... »
   |  code à 6 chiffres + nouveau mot de passe >= 8 caractères
   v
verifyOtp({ email, token: code, type: 'recovery' })
   |
   v
updateUser({ password: newPassword })
   |
   v
provisionCurrentPermanentSession()
   |
   +--> action en attente : finishAccountCreation()
   +--> aucune action : /(tabs)
```

Le message neutre d'anti-énumération n'est affiché sur `/reset-confirm` que lorsque la navigation
porte `sent=1`, c'est-à-dire après une réponse réussie à la demande initiale. Une erreur de réseau
ou de limitation est présentée de manière générique. Les handlers de confirmation et de renvoi
possèdent chacun un verrou synchrone en plus de l'état visuel : deux taps immédiats ne créent
qu'une requête.

L'arrivée sur `/reset-confirm` après le premier envoi démarre immédiatement un cooldown de
30 secondes. Chaque renvoi réussi le réarme ; un échec de renvoi n'ajoute pas de cooldown local.
Supabase documente toutefois une fenêtre `/recover` de 60 secondes par défaut, personnalisable.
La décision Cloudbreak est donc de configurer **Authentication → Rate Limits → Password reset
request** avec une fenêtre **inférieure ou égale à 30 secondes**, afin que le bouton redevienne
utilisable au même moment que le serveur. Référence :
[Rate limits — Supabase Auth](https://supabase.com/docs/guides/auth/rate-limits).

## Configuration opérateur requise

Dans le projet Supabase hébergé, configurer **Authentication → Email Templates → Reset Password** :

- remplacer le parcours par lien par un code affichant `{{ .Token }}` ;
- ne pas dépendre de `{{ .ConfirmationURL }}` : le flux Cloudbreak vérifie directement l'OTP avec
  `verifyOtp({ type: 'recovery' })`, donc aucun `redirectTo` n'est requis ;
- prévoir les variantes FR et EN à partir de `.Data.locale` ;
- utiliser le français si la locale est absente, invalide ou non synchronisable ;
- régler **Authentication → Rate Limits → Password reset request** à une fenêtre inférieure ou
  égale à 30 secondes (la valeur Supabase par défaut est 60 secondes) ;
- tester la réception réelle avec un compte dont l'e-mail est confirmé, la longueur de six chiffres
  et `verifyOtp` avec `type: 'recovery'` ;
- en cas de non-réception, consulter **Authentication → Logs** et filtrer la demande `recovery`
  du compte de test. Le log debug mobile se limite à `hasError`, `code` et `status` : il ne contient
  jamais l'adresse, l'OTP, le mot de passe ni un jeton.

Le fournisseur peut renvoyer `429`, `over_email_send_rate_limit` ou un message de rate limit.
L'app affiche alors une copie dédiée et ne navigue pas. Les limites e-mail Supabase (souvent de
l'ordre de 2 à 4 messages par heure selon la configuration) et le cooldown recovery peuvent faire
échouer un essai après des tests de signup récents ; les logs Dashboard sont la source de preuve.

Le template lit la locale stockée dans `user_metadata.locale` du **compte destinataire**. Changer
uniquement la langue courante de l'app avant une récupération ne garantit donc pas la langue du
mail. Les tests FR et EN doivent employer deux comptes contrôlés dont les métadonnées sont
préconfigurées respectivement à `fr` et `en`; une locale absente ou invalide doit produire le
fallback français. La synchronisation côté app reste best-effort. Garantir exactement la locale
pré-auth courante pour n'importe quel destinataire nécessiterait plus tard un mécanisme d'e-mail
transactionnel dédié. La configuration Dashboard et la preuve de livraison restent manuelles.

## Écart avec les AC provisoires

`_bmad-output/planning-artifacts/epics.md` décrit encore un e-mail contenant un **lien**. La spec
validée de la story remplace ce lien par un **OTP à six chiffres saisi dans l'app**. L'intention des
AC reste satisfaite — recevoir une preuve par e-mail, choisir un nouveau mot de passe, puis pouvoir
se reconnecter — sans deep link ni session injectée depuis une URL.

## Comment tester

- Parcours dédié et cas limites :
  [`docs/story-2-7-mot-de-passe-oublie/guide-test.md`](story-2-7-mot-de-passe-oublie/guide-test.md).
- Parcours compte global : [`docs/story-2-5-manual-test-guide.md`](story-2-5-manual-test-guide.md),
  section 7.
- Configuration du template et livraison réelle : `cloudbreak/docs/email.md` dans le dépôt
  coordinateur (hors submodule mobile).
- Appels REST Supabase reproductibles, sans secret commité :
  [`http/story-2-7-mot-de-passe-oublie.http`](../http/story-2-7-mot-de-passe-oublie.http).

## Acceptance Criteria vérifiés

- [x] **AC1 — demander une récupération depuis la connexion.** Le CTA ouvre `/reset`, puis
  `resetPasswordForEmail(email)` demande l'e-mail Supabase. Le code et les tests automatisés sont
  verts ; la livraison réelle dépend encore du template Dashboard.
- [x] **AC2 — définir un nouveau mot de passe et se reconnecter.** Le mécanisme validé remplace le
  lien provisoire par `verifyOtp(type: 'recovery')`, exige huit caractères, appelle
  `updateUser({ password })`, puis provisionne la session. La reconnexion réelle ancien/nouveau
  mot de passe reste dans la validation manuelle opérateur.

## Validation automatisée

`npm run validate` est vert le 2026-09-09 : TypeScript, Expo lint, 111 suites / 949 tests,
couverture globale 97,74 % des instructions et export iOS réussi. Les écrans `/reset` et
`/reset-confirm` sont couverts à 100 % (instructions, branches, fonctions et lignes).
