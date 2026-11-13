# Story 2.3 — Permission Géolocalisation (Opt-in sans Blocage)

## Ce qui a été fait

- `expo-location` ajouté comme dépendance native (`app.config.ts` : plugin avec
  `locationWhenInUsePermission`).
- `AuthContext` étend son état avec `locationPermission: 'undetermined' | 'granted' | 'denied'`,
  `setLocationPermission()` et `refreshLocationPermission()` (source de vérité = iOS,
  relu via `Location.getForegroundPermissionsAsync()` au montage et au focus du Profil).
- `useLocationPermission` (hook, `src/hooks/onboarding/`) — demande la permission
  foreground via `requestForegroundPermissionsAsync()`, jamais bloquant.
- `LocationSlide` — 4e étape de l'onboarding (`src/components/onboarding/location-slide/`),
  clone structurel de `NotificationsSlide`.
- `useOnboardingFlow` — nouvelle étape `onb4`, transition `goToLocation()`.
- `NotificationsSlide` — prop renommée `onFinish` → `onGoNext` (ne termine plus
  l'onboarding, passe le relais à `onb4`).
- `useLocationSettingsLink` (hook, `src/hooks/`) — ouvre les réglages iOS
  (`Linking.openSettings()`) depuis le Profil.
- Écran Profil — nouvelle ligne "Localisation" (section Preferences), affiche le
  statut courant, ouvre les réglages iOS au tap.
- `MascotBreadcrumb` — les 4 slides d'onboarding passent désormais `total={4}`.

## Comment ça fonctionne

Au 4e écran d'onboarding, l'utilisateur voit un message expliquant l'usage futur de
la position ("Confirme ta présence au sommet"). S'il appuie sur "Autoriser",
le popup système iOS apparaît ; qu'il accepte ou refuse, l'onboarding se termine
normalement (AC 2 — zéro blocage). Aucune coordonnée n'est lue ou transmise à ce
stade — seul le statut de la permission (`granted`/`denied`) est mémorisé dans
`AuthContext`. S'il a refusé, l'utilisateur peut revenir dessus à tout moment
depuis Profil → Localisation, qui ouvre directement les réglages iOS de l'app.

## Comment tester

100% mobile — aucun endpoint backend concerné par cette story.

1. `cd mobile && npx expo run:ios`
2. Profil → DEV · Rejouer l'onboarding
3. Parcourir jusqu'à l'écran 4 "Confirme ta présence au sommet"
4. Tester "Autoriser" (popup système) puis "Plus tard" (aucun popup) sur deux
   passages différents — dans les deux cas, l'app arrive normalement sur l'écran
   principal.
5. Aller dans Profil, vérifier que la ligne "Localisation" affiche le bon statut
   et ouvre bien les réglages iOS au tap.

## Acceptance Criteria vérifiés

- [x] AC1 — écran dédié avec message explicite + "Autoriser"/"Pas maintenant"
- [x] AC2 — aucun blocage, score/recherche/favoris restent accessibles quel que
      soit le choix
- [x] AC3 — lien Profil vers les réglages iOS
- [x] AC4 — `expo-location` confirme le statut, mémorisé dans `AuthContext`
