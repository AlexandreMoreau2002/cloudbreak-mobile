# Story 2.7 — Mot de passe oublié

Le parcours de récupération est entièrement mobile : depuis la connexion, l'utilisateur demande
un code à six chiffres, le confirme avec un nouveau mot de passe, puis retrouve l'application ou
l'action qui l'avait amené au compte. Le backend Cloudbreak n'ajoute aucun endpoint : le parcours
emploie directement Supabase Auth.

## Documentation canonique

- Explication du flux, des responsabilités et de la configuration Supabase :
  [`fonctionnement.md`](story-2-7-mot-de-passe-oublie/fonctionnement.md).
- Procédure manuelle complète, prérequis et cas limites :
  [`guide-test.md`](story-2-7-mot-de-passe-oublie/guide-test.md).
- Parcours compte global (dont son résumé §7) :
  [`story-2-5-manual-test-guide.md`](story-2-5-manual-test-guide.md).
- Configuration opérateur partagée du template et de la livraison : `docs/email.md` dans le dépôt
  coordinateur Cloudbreak, hors du submodule mobile.
- Requêtes REST Supabase reproductibles, sans secret commité :
  [`http/story-2-7-mot-de-passe-oublie.http`](../http/story-2-7-mot-de-passe-oublie.http).

## État de validation

Les tests automatisés couvrent les validations, erreurs, navigation, cooldown, doubles taps et le
replay d'action. La livraison réelle reste une validation opérateur : template « Reset Password »
avec `{{ .Token }}`, compte confirmé, rate limits et logs Supabase.
