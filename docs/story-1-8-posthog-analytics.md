# Story 1.8 — PostHog mobile

## Résultat

L'adaptateur `src/services/analytics.ts` initialise une seule instance de PostHog seulement quand
la build EAS fournit `EXPO_PUBLIC_POSTHOG_KEY` et `EXPO_PUBLIC_POSTHOG_HOST`. Les écrans gardent
leur interface `track()` existante et n'envoient que la taxonomie UI explicitement autorisée vers
le projet dev/TestFlight.

## Comportement et confidentialité

- Sans clé ou hôte, le client n'est pas créé : `track()` est un no-op et l'application démarre sans
  trafic réseau PostHog.
- Une liste blanche valide chaque événement et propriété (enum, UUID, date, booléen ou entier
  borné). Les textes libres, PII, jetons, messages d'erreur, coordonnées précises et événements
  inconnus sont rejetés. `auth_submitted` reste exclu jusqu'à ce que `error_code` soit un enum
  stable.
- Autocapture, replay, suivi d'erreurs, logs, feature flags, surveys, configuration distante,
  profils de personne et rage clicks sont désactivés ou non configurés. Sentry reste responsable
  des erreurs.

## Validation effectuée et limite locale

- TypeScript a réussi et les tests ciblés couvrent l'absence de clé, l'initialisation unique, les
  options de confidentialité et le filtrage des événements.
- Sur cette machine, les lancements locaux de Jest ciblé puis d'ESLint ont bloqué sans sortie ; ils
  ont été arrêtés après délai. Ce comportement de runner doit être repris séparément : il ne valide
  ni n'invalide la build native.

## Prérequis TestFlight

1. Poser `EXPO_PUBLIC_POSTHOG_KEY` et `EXPO_PUBLIC_POSTHOG_HOST` dans l'environnement EAS dev,
   sans les commiter ni les écrire dans les logs.
2. Générer une nouvelle build iOS native et la distribuer sur TestFlight, dans la même version que
   le test Sentry.
3. Vérifier dans Live Events du projet dev/TestFlight la taxonomie attendue et l'absence de
   collecte automatique ou de donnée personnelle.

Le projet actuel ne doit recevoir aucun trafic public. Créer un projet et une clé PostHog de
production séparés, puis rejouer la recette, avant toute activation publique.
