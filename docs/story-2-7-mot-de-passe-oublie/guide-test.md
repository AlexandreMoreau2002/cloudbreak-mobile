# Mot de passe oublié — guide de test manuel

## Prérequis

- Utiliser un build mobile relié au projet Supabase de développement.
- Disposer d'une adresse de test contrôlée avec un compte Cloudbreak permanent existant.
- Connaître l'ancien mot de passe pour vérifier qu'il devient invalide.
- Dans **Authentication → Email Templates → Reset Password**, configurer un corps FR/EN avec
  fallback français et `{{ .Token }}` visible ; ne pas laisser un template limité à
  `{{ .ConfirmationURL }}`.
- Vérifier que l'OTP Supabase est à six chiffres et que les limites d'envoi permettent le test.
- Employer un compte dont l'e-mail est confirmé si **Confirm email** est activé.
- Le flux OTP n'a besoin ni de `redirectTo` ni de `{{ .ConfirmationURL }}` : le template doit
  montrer `{{ .Token }}` et l'app emploie `verifyOtp({ type: 'recovery' })`.
- Dans **Authentication → Rate Limits → Password reset request**, remplacer la fenêtre Supabase
  par défaut de 60 secondes par une valeur inférieure ou égale à 30 secondes, décision Cloudbreak
  nécessaire pour l'aligner avec le cooldown de l'app.
- Préparer trois comptes destinataires contrôlés : `user_metadata.locale = 'fr'`,
  `user_metadata.locale = 'en'`, puis locale absente ou invalide. La langue courante de l'app seule
  ne suffit pas à piloter de façon fiable le template de récupération.
- Ne jamais coller l'OTP, le mot de passe, l'access token ou une adresse personnelle dans les logs,
  captures, tickets ou commits.
- Pour diagnostiquer une non-réception, consulter **Authentication → Logs**, filtrer `recovery` et
  le compte de test. Le log DEBUG mobile est volontairement borné à `hasError`, `code` et `status`.

## Scénario 1 — parcours nominal français

1. Sur l'écran compte, passer en mode **Se connecter**.
2. Appuyer sur **Mot de passe oublié ?** : `/reset` s'ouvre.
3. Saisir l'adresse du compte existant puis **Envoyer le code**.
4. Vérifier l'arrivée sur `/reset-confirm` et le message neutre « Si un compte existe… ».
5. Vérifier que **Renvoyer le code** affiche immédiatement un compte à rebours de 30 secondes.
6. Ouvrir l'e-mail « Reset Password » et confirmer que le corps est en français et affiche un code
   à six chiffres, pas seulement un lien.
7. Saisir le code et un nouveau mot de passe d'au moins huit caractères.
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
3. Passer à huit caractères, puis effectuer deux taps très rapides.

Résultat attendu : aucun appel sous huit caractères et une seule confirmation avec une valeur
valide. Si Supabase refuse un mot de passe de huit caractères pour une règle plus stricte, la copie
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

## Scénario 8 — langues et fallback

1. Demander un code au compte contrôlé dont `user_metadata.locale = 'fr'` : corps français.
2. Demander un autre code au compte contrôlé dont `user_metadata.locale = 'en'` : corps anglais.
3. Demander un code au compte avec locale absente ou invalide : corps français.
4. Changer seulement la langue courante de l'app et vérifier qu'on ne prétend pas qu'elle pilote
   le mail : le template dépend des métadonnées du compte destinataire.

Résultat attendu : FR, EN, puis fallback FR. Si le Dashboard ne rend pas la condition dans le
sujet, utiliser un sujet bilingue neutre et conserver le corps conditionnel. Si une correspondance
exacte avec la locale pré-auth courante devient obligatoire, ouvrir un chantier d'e-mail
transactionnel dédié.

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
- [ ] Mot de passe inférieur à huit caractères : confirmation bloquée.
- [ ] Doubles taps confirmation/renvoi : une seule requête.
- [ ] Premier envoi : cooldown immédiat 30 secondes.
- [ ] Renvoi à 30 secondes accepté par la fenêtre Supabase configurée ; succès : cooldown réarmé.
- [ ] Échec de renvoi : aucun nouveau cooldown local.
- [ ] Action en attente rejouée ; fallback Home si le replay échoue.
- [ ] Ancien mot de passe refusé ; nouveau accepté.
- [ ] E-mails FR, EN et fallback FR observés avec trois métadonnées destinataires contrôlées.
- [ ] Aucun OTP, mot de passe, token ou e-mail personnel exposé dans les logs.
- [ ] Limites serveur/CAPTCHA Supabase évalués avant production.
