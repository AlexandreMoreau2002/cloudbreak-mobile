# Story 1.8 — Sentry mobile

## Résultat

L'application Expo / React Native initialise Sentry une seule fois avant le rendu du layout racine lorsque `EXPO_PUBLIC_SENTRY_DSN` est fourni au build. Sans DSN, le SDK reste désactivé et l'application démarre sans télémétrie.

## Périmètre natif

- `@sentry/react-native` est installé avec la configuration Expo et Metro nécessaire aux source maps.
- Le projet cible est `cloudbreak-mobile` dans l'organisation Sentry `self-oaq`.
- Une nouvelle build iOS native est nécessaire : elle sera testée en environnement dev/TestFlight avec la future intégration PostHog dans la même version, sans soumission App Store à ce stade.

## Données et sécurité

Le SDK est en mode erreurs seulement. Il n'envoie pas l'utilisateur, requête, tags, extras, contexts, breadcrumbs ni les valeurs des exceptions. PII, captures d'écran, hiérarchie de vue, logs, sessions, replay, profiling, feedback, tracing de performance, démarrage préchauffé et propagation de trace HTTP sont désactivés explicitement.

`EXPO_PUBLIC_SENTRY_DSN` est configuré dans EAS au build. `SENTRY_AUTH_TOKEN` sert uniquement au téléversement des source maps et doit rester un secret EAS ; aucun des deux n'est commité dans le dépôt.

## Validation effectuée

- Les tests ciblés couvrent le no-op sans DSN, l'initialisation unique et le filtre des valeurs synthétiques sensibles.
- La validation mobile initiale a passé TypeScript, lint, 145 suites Jest / 1 382 tests et l'export iOS.
- La revue finale a confirmé l'extinction explicite des deux options de tracing natives et l'ordre des imports.

## Prérequis avant validation réelle

1. Poser le DSN mobile et le secret de source maps dans EAS dev.
2. Générer une build native et la distribuer en TestFlight.
3. Vérifier une erreur contrôlée dans `cloudbreak-mobile`, une pile lisible et l'absence de données personnelles.
4. Retirer tout mécanisme temporaire de test avant une soumission App Store.
