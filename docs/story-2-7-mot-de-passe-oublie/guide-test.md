# Mot de passe oublié — guide de test manuel

## Prérequis

- Utiliser un build mobile relié au projet Supabase de développement.
- Disposer d'une adresse de test contrôlée avec un compte Cloudbreak permanent existant.
- Connaître l'ancien mot de passe pour vérifier qu'il devient invalide.
- Dans **Authentication → Email Templates → Reset Password**, recharger le mode source et
  vérifier le contrat sauvegardé : sujet `Réinitialise ton mot de passe, Cloudbreak Mer de nuage`
  et un unique bloc français contenant `{{ .Token }}`. Le corps ne doit contenir ni
  `{{ .ConfirmationURL }}`, ni `.Data.locale`, ni les textes `Reset Password` / `Follow this link`.
- Vérifier que l'OTP Supabase est à six chiffres et que les limites d'envoi permettent le test.
- Employer un compte dont l'e-mail est confirmé si **Confirm email** est activé.
- Le flux OTP n'a besoin ni de `redirectTo` ni de `{{ .ConfirmationURL }}` : le template doit
  montrer `{{ .Token }}` et l'app emploie `verifyOtp({ type: 'recovery' })`.
- Dans **Authentication → Rate Limits → Password reset request**, remplacer la fenêtre Supabase
  par défaut de 60 secondes par une valeur inférieure ou égale à 30 secondes, décision Cloudbreak
  nécessaire pour l'aligner avec le cooldown de l'app.
- Le reset est français fixe : un seul compte contrôlé confirmé suffit. Changer la langue de l'app
  ne doit pas être présenté comme un test d'i18n du mail.
- Ne jamais coller l'OTP, le mot de passe, l'access token ou une adresse personnelle dans les logs,
  captures, tickets ou commits.
- Pour diagnostiquer une non-réception, consulter **Authentication → Logs**, filtrer `recovery` et
  le compte de test. Le log DEBUG mobile est volontairement borné à `hasError`, `code` et `status`.

## Scénario 1 — vérifier le template puis parcours nominal français

1. Sur l'écran compte, passer en mode **Se connecter**.
2. Appuyer sur **Mot de passe oublié ?** : `/reset` s'ouvre.
3. Saisir l'adresse du compte existant puis **Envoyer le code**.
4. Vérifier l'arrivée sur `/reset-confirm` et le message neutre « Si un compte existe… ».
5. Vérifier que **Renvoyer le code** affiche immédiatement un compte à rebours de 30 secondes.
6. Ouvrir l'e-mail et confirmer que le sujet est `Réinitialise ton mot de passe, Cloudbreak Mer de
   nuage`, puis que le corps contient exactement un bloc français avec un seul code à six chiffres,
   sans lien de réinitialisation ni texte anglais/doublé. Ne pas copier le code dans les logs ou
   captures.
7. Saisir le code et un nouveau mot de passe d'au moins six caractères (jauge de force informative
   uniquement, non bloquante).
8. Appuyer sur **Réinitialiser** : une seule requête part et l'app arrive sur Home.
9. Se déconnecter et exécuter le scénario de reconnexion décrit plus bas.

Résultat attendu : mot de passe modifié, session utilisable, aucun écran bloqué.

## Scénario 2 — adresse inconnue et anti-énumération

1. Refaire la demande avec une adresse de test qui ne correspond à aucun compte.
2. Comparer l'écran avec le scénario nominal.
3. Vérifier qu'aucun e-mail n'arrive dans la boîte contrôlée.

Résultat attendu : même message neutre, aucun indice « compte existant/inexistant ». Une erreur de
réseau ou de limitation doit rester générique. Signaler toute différence de statut, de copie ou de
temps suffisamment nette pour permettre une énumération.

## Scénario 3 — code faux puis code expiré

1. Demander un vrai code.
2. Saisir `000000` avec un mot de passe valide et valider.
3. Vérifier « Code incorrect ou expiré », le marquage du champ et l'absence de navigation.
4. Demander un nouveau code, puis tenter l'ancien code remplacé ou attendre son expiration.

Résultat attendu : même erreur produit, mot de passe non modifié et écran toujours utilisable.

## Scénario 4 — renvoi, échec et cooldown

1. Après le premier envoi, vérifier qu'un cooldown initial de 30 secondes est déjà actif.
2. À son expiration, appuyer sur **Renvoyer le code**. Avec la fenêtre Dashboard configurée à
   30 secondes maximum, Supabase doit accepter la requête au lieu de répondre `429`.
3. Vérifier la réception d'un nouvel e-mail et le redémarrage du cooldown à 30 secondes.
4. À l'expiration suivante, couper le réseau et appuyer sur **Renvoyer le code**.
5. Vérifier le message générique et l'absence de **nouveau** cooldown local : un essai reste
   possible. Si la requête a atteint Supabase et reçoit un rate-limit, le serveur peut continuer à
   la refuser jusqu'à la fin de sa fenêtre configurée.
6. Taper plusieurs fois rapidement pendant l'appel puis pendant le cooldown.

Résultat attendu : cooldown initial et après chaque succès, un seul envoi par action, et acceptation
du premier renvoi à l'expiration de la fenêtre de 30 secondes configurée. Un échec n'ajoute pas de
cooldown local. Une erreur `429`, `over_email_send_rate_limit` ou rate limit affiche le message
dédié ; vérifier le statut dans le log DEBUG borné puis dans les logs Dashboard.

## Scénario 5 — mot de passe trop court

1. Saisir un code de six chiffres et un mot de passe de sept caractères.
2. Vérifier que **Réinitialiser** reste désactivé.
3. Passer à six caractères, puis effectuer deux taps très rapides.

Résultat attendu : aucun appel sous six caractères et une seule confirmation avec une valeur
valide. Si Supabase refuse un mot de passe de six caractères pour une règle plus stricte, la copie
« mot de passe trop faible » s'affiche et l'utilisateur reste sur l'écran.

## Scénario 6 — action en attente

1. En invité, déclencher une action nécessitant un compte, par exemple l'ajout d'un favori.
2. Choisir **Se connecter**, puis ouvrir le parcours de mot de passe oublié.
3. Terminer la récupération avec succès.

Résultat attendu : `finishAccountCreation()` rejoue l'action en attente et restitue la route
prévue. Si le replay échoue, le gate renvoie un fallback contrôlé ; l'app revient sur Home et
libère le formulaire au lieu de rester en chargement.

## Scénario 7 — ancien et nouveau mot de passe

1. Après un reset réussi, se déconnecter.
2. Tenter de se connecter avec l'ancien mot de passe.
3. Tenter ensuite avec le nouveau mot de passe.

Résultat attendu : ancien mot de passe refusé ; nouveau mot de passe accepté ; aucun écran de
vérification ou mini-sondage lors de cette reconnexion.

## Scénario 8 — langue de l'app sans effet sur le reset

1. Demander un code avec l'app en français et vérifier le bloc français unique.
2. Changer seulement la langue courante de l'app en anglais et demander un nouveau code après le
   délai autorisé.
3. Vérifier que le second mail reste français et identique dans sa structure.

Résultat attendu : le reset reste FR fixe. Toute i18n réelle du reset est un chantier séparé de
mailer backend/Edge Function ; ne pas réintroduire `.Data.locale` dans ce template Supabase.

## Cas limites supplémentaires

- E-mail vide ou sans `@` : erreur locale, aucune requête.
- `/reset-confirm` ouvert sans paramètre `email` : retour automatique vers `/reset`.
- Erreur de provisioning après le changement : message générique, aucun secret dans les logs.
- Tuer puis relancer l'app après vérification OTP : contrôler l'état de la session recovery dans le
  Keychain et vérifier qu'aucun accès inattendu ne contourne la finalisation du mot de passe.
- Confirmer dans le Dashboard que la fenêtre `/recover`, de 60 secondes par défaut chez Supabase,
  est configurée à 30 secondes maximum et que le premier renvoi à 30 secondes est accepté.

## Checklist finale

- [ ] Adresse connue : code reçu et message neutre.
- [ ] Adresse inconnue : même message, aucun e-mail.
- [ ] Code faux et expiré : erreur, aucune navigation.
- [ ] Mot de passe inférieur à six caractères : confirmation bloquée. Mot de passe faible mais
      ≥ six caractères : confirmation acceptée (jauge affichée à titre informatif seulement).
- [ ] Doubles taps confirmation/renvoi : une seule requête.
- [ ] Premier envoi : cooldown immédiat 30 secondes.
- [ ] Renvoi à 30 secondes accepté par la fenêtre Supabase configurée ; succès : cooldown réarmé.
- [ ] Échec de renvoi : aucun nouveau cooldown local.
- [ ] Action en attente rejouée ; fallback Home si le replay échoue.
- [ ] Ancien mot de passe refusé ; nouveau accepté.
- [ ] Dashboard rechargé : sujet exact, corps français unique, un seul `{{ .Token }}`, aucun
  marqueur ou texte legacy.
- [ ] Prochain e-mail reçu : un seul bloc français, un seul OTP à six chiffres, aucun franglais,
  doublon ou lien ; l'OTP n'est pas consigné.
- [ ] Aucun OTP, mot de passe, token ou e-mail personnel exposé dans les logs.
- [ ] Limites serveur/CAPTCHA Supabase évalués avant production.
