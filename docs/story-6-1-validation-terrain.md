# Story 6.1 — Validation Terrain (Confirmation/Infirmation)

_Complétée le 2026-07-24_

---

## Ce qui a été fait

### Fichiers créés

| Fichier | Rôle |
|---------|------|
| `src/hooks/useTerrainValidation.ts` | State machine du sheet de validation (`searching` → `ready` \| `denied` → `success`). Expose `open()` (déclenche la géoloc), `validateManually()` (bypass GPS), `answer(result, ctx)` (appelle l'API), `dismiss()`. |
| `src/hooks/useTerrainAutoDetect.ts` | Détecte la proximité GPS (rayon 500m) d'un sommet consulté, uniquement pendant que l'app est au premier plan — remplace le trigger notification push prévu par l'Epic 5 (bloqué, cf. Story 5.3 en statut non livrable). Utilise `watchPositionAsync` avec `distanceInterval: 50m` / `timeInterval: 30s`, et une fonction `haversineDistanceMeters` pure (testable indépendamment). |
| `src/components/validation/ValidationBottomSheet.tsx` | Composant bottom sheet (Modal + Animated, mêmes patterns que `PaywallScreen`, pas de librairie externe). 4 étapes rendues selon `step` : `searching` (spinner), `ready` (question Oui/Non + rappel du score), `denied` (permission refusée → CTA "Valider manuellement"), `success` (message de remerciement). Pas d'étape photo — hors scope, prévue Story 6.2. |
| `src/components/validation/index.ts` | Re-export. |

### Fichiers modifiés

| Fichier | Rôle |
|---------|------|
| `src/services/api/validations.ts` | Bug corrigé : le payload n'était pas réellement envoyé à l'API — `postTerrainValidation` construit maintenant le body réel. Conversion à la frontière API : `result: 'confirmed' | 'denied'` (type interne du hook) → `result: boolean` (contrat backend) fait ici, pas dans le hook. |
| `src/services/api/validations.test.ts` | Tests mis à jour (payload envoyé, conversion booléenne, mode MOCK). |
| `src/services/fetchService.ts` (types re-exportés) | `ScoreResponse` porte désormais `prediction_id` — nécessaire pour lier une validation terrain à la prédiction consultée. |
| `src/components/score-card/ScoreCard.tsx` | Nouvelle prop optionnelle `onValidateTerrain?: () => void`. Si fournie, affiche un bouton discret (icône ✓) en coin haut-droit de la carte (`testID="validate-terrain-button"`). Absente → aucun changement visuel (rétro-compatible, la ScoreCard n'est utilisée qu'à l'écran Home actuellement). |
| `src/app/(tabs)/index.tsx` | Wiring complet : `useTerrainValidation` + `useTerrainAutoDetect` instanciés, `handleValidateTerrain` (tracking `terrain_validation_opened`, source `manual`) branché sur `onValidateTerrain` de la `ScoreCard`, `handleTerrainAnswer` branché sur `answer()`, `<ValidationBottomSheet>` rendu en overlay avec les états du hook. |
| `src/app/(tabs)/index.test.tsx` | Tests mis à jour (ouverture manuelle, auto-détection, réponse oui/non, permission refusée). |
| `src/locales/fr.ts` / `src/locales/en.ts` | Namespace `terrain.*` ajouté : `searchingTitle`, `searchingBody`, `gpsConfirmed`, `forecastRecall`, `question`, `answerYes`, `answerNo`, `later`, `gpsUnavailable`, `deniedTitle`, `deniedBody`, `validateManually`, `successTitle`, `successBody`, `close`. |

## Comment ça fonctionne

Il y a **deux points d'entrée** pour ouvrir le sheet de validation :

1. **Bouton discret sur la `ScoreCard`** — coin haut-droit, icône ✓. Toujours disponible quand une prévision est affichée. Tracké comme `source: 'manual'`.
2. **Auto-détection géolocalisation (foreground)** — `useTerrainAutoDetect` surveille la position de l'utilisateur en tâche de fond légère (uniquement pendant que l'app est ouverte et qu'un sommet est consulté) et déclenche automatiquement l'ouverture du sheet (`terrain.open()`) quand l'utilisateur passe sous les 500m du sommet. C'est le remplacement direct du déclenchement par notification push prévu à l'Epic 5, qui est bloqué (voir `_bmad-output/planning-artifacts/epics.md`, Story 5.3).

**State machine du sheet** (`useTerrainValidation`) :

```
        open()
          │
          ▼
  permission refusée ? ──oui──► denied ──► validateManually() ──► ready (sans GPS)
          │ non                              │
          ▼                                  │
      searching                              │
          │                                  │
   getCurrentPositionAsync                   │
          │                                  │
     succès │ échec                          │
          ▼    └──────────────────────────► denied
        ready ◄─────────────────────────────┘
          │
     answer(true|false)
          │
          ▼
       success
```

**Permission refusée gérée sans bloquer** : si la permission de localisation n'est pas `granted` (statut géré globalement par `AuthContext`, cf. Story 2.3), le sheet passe directement à l'étape `denied` — l'utilisateur peut toujours valider manuellement via `validateManually()`, qui saute la géoloc et passe à `ready` avec `noGps: true` (aucun `lat`/`lng` envoyé à l'API dans ce cas). Aucune fonctionnalité n'est bloquée par un refus de permission.

**Conversion à la frontière API** : le hook `useTerrainValidation` travaille avec un type interne lisible (`result: boolean` dans `answer()`), converti en `'confirmed' | 'denied'` côté `TerrainValidationPayload` (services/api), puis reconverti en `boolean` strict juste avant l'appel HTTP dans `postTerrainValidation` — c'est cette dernière conversion qui était le bug initial (le payload n'était pas construit du tout).

## Comment tester manuellement

### Prérequis

- `expo-location` est déjà un module natif installé (Story 2.3, permission foreground). Cette story est la première à appeler réellement `getCurrentPositionAsync` / `watchPositionAsync` (avant, seul le statut de permission était lu) — ces fonctions ne nécessitent pas de nouveau module natif, donc en théorie **pas de rebuild nécessaire**. À vérifier néanmoins : si le simulateur renvoie une erreur de permission native inattendue, relancer `npx expo run:ios` pour être sûr que le binaire est à jour.
- Simulateur avec `DEBUG=true` pour voir les logs `[useTerrainValidation]` / `[useTerrainAutoDetect]` en console.

### Scénario 1 — Bouton manuel

1. Ouvrir l'app, sélectionner un sommet, attendre l'affichage de la `ScoreCard`.
2. Taper le bouton discret (icône ✓) en coin haut-droit de la `ScoreCard`.
3. Vérifier l'étape `searching` (spinner) puis `ready` (pastille GPS confirmée + rappel du score + boutons Oui/Non).
4. Taper "Oui" ou "Non".
5. Vérifier l'écran `success` ("Merci ! Ta validation aide à affiner les prévisions").
6. Vérifier côté réseau (via les logs `DEBUG` ou un proxy) que `POST /api/v1/validations` est bien appelé avec `prediction_id`, `result` (booléen), `lat`, `lng`.

### Scénario 2 — Permission refusée

1. Réglages iOS > app Cloudbreak > Position > **Jamais** (ou refuser lors du prompt initial).
2. Revenir dans l'app, taper le bouton manuel de la `ScoreCard`.
3. Vérifier l'affichage direct de l'étape `denied` ("on n'a pas pu te localiser" + pastille grisée).
4. Taper "Valider manuellement".
5. Vérifier le passage à `ready` sans pastille GPS confirmée (`noGps: true`), puis répondre Oui/Non normalement.
6. Vérifier que l'appel réseau part bien sans `lat`/`lng` (undefined).

### Scénario 3 — Auto-détection GPS (difficile à reproduire en simulateur)

Nécessite soit un device réel se déplaçant physiquement à moins de 500m d'un sommet en base, soit une simulation de position :
- Simulateur iOS : **Features > Location > Custom Location...** (ou via Xcode : **Debug > Simulate Location**), régler des coordonnées à moins de 500m d'un sommet consulté dans l'app.
- Rester sur l'écran Home avec ce sommet sélectionné, attendre le déclenchement automatique (jusqu'à 30s selon `TIME_INTERVAL_MS`) — le sheet doit s'ouvrir seul, sans interaction, à l'étape `ready`.
- Vérifier qu'il ne se redéclenche pas en boucle une fois fermé (`hasFiredRef` doit bloquer les déclenchements suivants tant que le composant ne se remonte pas).

### Scénario 4 — Non-régression ScoreCard

- La prop `onValidateTerrain` est optionnelle et la `ScoreCard` n'est utilisée qu'à l'écran Home (`src/app/(tabs)/index.tsx`) — aucun autre écran ne l'affiche actuellement, donc pas de risque de régression ailleurs. Vérifier tout de même que l'écran Home s'affiche normalement (bouton visible seulement quand une prévision est chargée, pas de bouton pendant loading/skeleton).

## Acceptance Criteria vérifiés

Les AC de la Story 6.1 (`_bmad-output/planning-artifacts/epics.md`) sont formulées côté backend/API ; couverture côté mobile :

- [x] **AC1** — Sheet affiché, appui sur "Oui" → `POST /api/v1/validations` appelé avec `{prediction_id, result: true, lat, lng}`, message de remerciement affiché. Couvert par `useTerrainValidation` (`answer(true, ...)`) + `ValidationBottomSheet` (étape `success`) + `validations.ts`.
- [x] **AC2** — Appui sur "Non" → `result: false` envoyé au même format. Couvert par `answer(false, ...)`.
- [x] **AC3** — Structure de `terrain_validations` (id, prediction_id, user_id, result, photo_url, lat, lng, validated_at) : côté backend, hors scope mobile — le payload envoyé (`prediction_id`, `result`, `lat`, `lng`) correspond aux colonnes consommées par cette story (pas de `photo_url`, prévu Story 6.2).
- [x] **AC4** — Appel sans JWT valide → 401 côté backend ; côté mobile, `answer()` ne tente même pas l'appel si `token` est `null` (garde explicite dans `useTerrainValidation`).
- [x] **Complément mobile (hors AC backend explicite)** — Déclenchement : bouton manuel ScoreCard (fait) + auto-détection géoloc foreground remplaçant la notification push Epic 5 bloquée (fait). Permission refusée → fallback "Valider manuellement" sans bloquer le flux (fait).

## Dette / hors scope

- Pas d'étape photo dans le sheet — prévue Story 6.2 (`photo_url`, upload galerie, compression).
- L'auto-détection ne fonctionne qu'en foreground (app ouverte) — aucun suivi en arrière-plan, choix de conception délibéré (voir `docs/security.md`).
