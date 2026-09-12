# Recherche de sommets et sélection dans l'onboarding

## Causes identifiées

- L'API configurée dans l'environnement local (`192.168.1.15:8000`) était arrêtée avec Docker. La base existante était aussi détachée du réseau `cloudbreak_default`.
- Le hook de recherche principal exigeait un token alors que `/api/v1/peaks/search` est public depuis l'onboarding préconnexion.
- L'étape sommet présentait une liste statique non sélectionnable après une erreur API, y compris pendant une recherche. Un sommet suggéré introuvable invalidait toute la liste.
- Les quatre libellés techniques d'étapes étaient affichés dans tous les builds.

## Correction et recette

La recherche doit fonctionner sans session. Les changements de texte, l'effacement et le démontage doivent invalider les anciennes réponses. Une erreur doit offrir « Réessayer », sans remplacer les résultats par une liste fixe. Les suggestions disponibles restent utilisables si une autre suggestion manque. Les libellés d'étapes sont réservés à `__DEV__`.

1. Dans Recherche, saisir `mont blanc`, puis `chamechaude` : les résultats suivent la requête.
2. Sélectionner un résultat lorsque le clavier est ouvert : le premier appui sélectionne le sommet.
3. Rejouer l'onboarding via le bouton DEV du profil, rechercher puis choisir un sommet à l'étape 2 et continuer : le sommet est conservé.
4. En cas d'API indisponible, vérifier l'erreur et « Réessayer » dans les deux recherches. Dans l'onboarding, continuer sans sommet doit rester possible.
5. Vérifier une recherche sans résultat et l'effacement d'une requête pendant son chargement.
6. En build de production, vérifier l'absence des libellés `01 · BIENVENUE` à `04 · LOCALISATION`. Ils restent présents en développement.

## Environnement local existant

Les conteneurs historiques appartiennent au projet Compose `cloudbreak`, avec le volume de données `cloudbreak_pgdata_dev`. Le `make dev` actuel emploie un autre projet/volume et rencontre un conflit de noms avec ces conteneurs. Pour cette session, les conteneurs existants ont été redémarrés et la base reconnectée au réseau existant avec l'alias `db` ; aucune base ni aucun profil n'a été effacé.

Contrôles réseau après réparation : `/health` confirme PostgreSQL et Redis disponibles ; `GET /api/v1/peaks/search?q=blanc` répond HTTP 200 sans token avec 20 résultats.

Cette correction ne valide pas l'ensemble du parcours Supabase, du compte Apple ou du mini-sondage.
