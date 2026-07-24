# Story 7.1 — Parcours Onboarding Narratif

**Source design** : handoff Claude Design `design_handoff_onboarding` (haute-fidélité, pixel-perfect exigé) — spec de référence `docs/superpowers/specs/2026-07-19-story-7-1-onboarding-design.md`.

## Ce qui a été fait

### Fichiers créés

| Fichier | Rôle |
|---------|------|
| `src/app/onboarding.tsx` | Route unique hors groupes `(auth)`/`(tabs)` — héberge la machine à états (`splash` / `onb1` / `onb2` / `onb3`) et le montage du `CloudCurtain` en overlay |
| `src/hooks/useOnboardingFlow.ts` | Machine à états extraite du composant route (transitions, timers, déclenchement unique du curtain, complétion) |
| `src/hooks/useOnboardingPeaks.ts` | Charge les 6 sommets curés par slug + recherche debounced 300ms sans token ; fallback statique offline |
| `src/hooks/useNotificationPermission.ts` | Wrapper `expo-notifications` — `requestPermissionsAsync()` réel, non bloquant quel que soit le résultat |
| `src/contexts/OnboardingContext.tsx` | Gate AsyncStorage (clé `onboarding_completed`) — hydratation, `null` tant que non hydraté, `completeOnboarding()` |
| `src/components/onboarding/splash-view/` | Splash animé in-app (mascotte pop-in + bob, wordmark, auto-advance 1800ms) |
| `src/components/onboarding/cloud-curtain/` | Transition mer de nuages (2500ms, Rise/Hold/Exit, swap d'écran à 880ms), une seule fois |
| `src/components/onboarding/welcome-slide/` | onb1 — Bienvenue, hero `MountainViz` |
| `src/components/onboarding/summit-slide/` | onb2 — sélection sommet par défaut (curés + recherche) |
| `src/components/onboarding/notifications-slide/` | onb3 — 2 cartes preview + CTA permission / "Plus tard" |
| `src/components/onboarding/mascot-breadcrumb/` | Indicateur d'étape partagé entre onb1/onb2/onb3 |
| `src/components/onboarding/mountain-viz/` | Hero illustration react-native-svg |
| `src/components/onboarding/cta/` | CTA partagé (`.cb-cta`) |
| `src/components/onboarding/mascot-motion/` | Utilitaire d'animation mascotte mutualisé |
| `src/services/analytics.ts` | Stub `track(event, props)` — log DEBUG uniquement, PostHog branché plus tard |
| `src/constants/onboardingPeaks.ts` | Les 6 sommets curés (slugs + données statiques pour le fallback offline) |
| `src/__tests__/features/onboarding-flow.test.tsx` | Test de feature — parcours complet |

### Fichiers modifiés

| Fichier | Rôle |
|---------|------|
| `src/app/_layout.tsx` | `AuthGuard` étendu — gate onboarding prioritaire sur la logique session (login/tabs) |
| `src/services/fetchService.ts` | `apiFetch` accepte un token nullable — endpoints peaks publics appelables sans auth |
| `src/services/api/peaks.ts` | `searchPeaks` adapté — paramètre token rendu optionnel |
| `src/constants/colors.ts` | Tokens couleur curtain (`--cb-*` mappés sur `ThemeContext`) |
| `src/locales/fr.ts` / `en.ts` | Toutes les strings onboarding (jamais en dur) |
| `package.json` | Nouvelles dépendances `expo-notifications`, `react-native-svg` |

## Comment ça fonctionne

```
Lancement app
  → flag onboarding_completed absent (AsyncStorage) ?
       OUI → /onboarding (route unique)
              splash (1800ms, mascotte pop-in + wordmark)
                → CloudCurtain (2500ms, UNE SEULE FOIS, swap d'écran à 880ms)
              onb1 Bienvenue      (hero MountainViz + CTA Continuer)
              onb2 Sommet défaut  (6 sommets curés + recherche API publique)
              onb3 Notifications (Autoriser → permission réelle non bloquante
                                   Plus tard → skip)
              → completeOnboarding() : flag=true + track('onboarding_complete')
              → router.replace vers (auth)/login (ou (tabs) si session existante)
       NON → logique session actuelle inchangée (login / tabs)

Relancement app (flag présent) → onboarding plus jamais montré
```

Points clés :
- **Le curtain ne se joue qu'une fois**, uniquement sur la transition `splash → onb1` ; les autres changements d'étape sont des cuts secs.
- **Sommets** : 6 sommets curés (Mont Aiguille, Grand Veymont, Dent de Crolles, Pic du Midi, Puy de Dôme, Chamechaude) chargés via l'API publique `/api/v1/peaks/{slug}` (sans auth désormais) + recherche debounced sur `/api/v1/peaks/search`. En cas d'échec réseau, fallback sur les données statiques locales (`onboardingPeaks.ts`) — l'utilisateur continue sans friction, sans persistance de sélection.
- **Permission push** : demande native réelle (`expo-notifications`), refus ou acceptation mènent tous les deux à la fin de l'onboarding sans message d'erreur ni friction.
- **Analytics** : `track('onboarding_complete')` via le stub `analytics.ts` — log DEBUG uniquement, intégration PostHog différée (idée ajoutée au PRD V2).
- **Sommet choisi** persisté via `SelectedPeakContext.setSelectedPeak` → visible comme sommet sélectionné dès le premier passage sur l'écran principal.

## Comment tester

### Automatique

```bash
cd mobile
npm run validate    # tsc + lint + test --coverage + build:check
```

### Manuel — rebuild obligatoire

**2 modules natifs ajoutés** (`expo-notifications`, `react-native-svg`) → un simple `npm start` ne suffit pas.

```bash
cd mobile
npx expo run:ios     # recompile le build natif + relance Metro
```

Puis, pour re-tester le premier lancement, **supprimer l'app du simulateur** (le flag `onboarding_completed` et la session persistent sinon en AsyncStorage/Keychain).

### Scénarios par AC

1. Premier lancement (app fraîchement installée) → `/onboarding` s'affiche (splash), jamais l'écran principal directement.
2. Vérifier que le curtain ne se joue qu'à la transition splash → onb1, puis cuts secs entre onb1/onb2/onb3, fidèles au handoff.
3. Sur onb3 : taper "Plus tard" ET tester "Autoriser" (accepter puis refuser via le popup système) → dans tous les cas, fin d'onboarding sans erreur affichée.
4. Terminer l'onboarding → vérifier redirection vers login (ou tabs si déjà authentifié), et `console.debug('[analytics]', 'onboarding_complete', ...)` visible en DEBUG.
5. Relancer l'app après complétion → onboarding ne réapparaît plus, directement login/tabs.
6. Sélectionner un sommet en onb2 → vérifier qu'il apparaît bien comme sommet sélectionné sur l'écran principal après le premier login.
7. **Cas offline écran 2** : couper le réseau avant onb2 → la liste des 6 sommets curés doit rester affichée (données statiques), recherche indisponible mais pas de crash, sélection non bloquante.
8. **Dark mode** : basculer le thème système et vérifier tokens curtain + contrastes sur les 3 écrans + splash.
9. **Refus permission** : vérifier qu'aucun message d'erreur ni blocage n'apparaît après refus (popup système "Ne pas autoriser").

Checklist de test Notion associée : **"✅ Tests story 7.1 — Parcours onboarding narratif"** (base "Test story", à cocher en live pendant la session de test simulateur).

## Acceptance Criteria vérifiés

- [x] **AC1** — Premier lancement (flag absent) → `/onboarding` s'affiche (splash), pas l'écran principal. Couvert par `_layout.test.tsx` (gate prioritaire) + `onboarding-flow.test.tsx`.
- [x] **AC2** — Splash → curtain (une fois) → 3 écrans Bienvenue/Sommet/Notifications, fidèles au handoff. Couvert par `useOnboardingFlow.test.ts` (déclenchement unique du curtain, transitions).
- [x] **AC3** — Refus de la permission notification → continue sans erreur ni friction ("Plus tard" idem). Couvert par `NotificationsSlide.test.tsx` (permission accordée/refusée → même issue).
- [x] **AC4** — Fin d'onboarding ("Autoriser" ou "Plus tard") → `onboarding_completed: true` persisté, `track('onboarding_complete')`, redirection login (ou tabs si session). Couvert par `OnboardingContext.test.tsx` + `analytics.test.ts` + `_layout.test.tsx`.
- [x] **AC5** — Flag présent au relancement → onboarding plus jamais affiché. Couvert par `OnboardingContext.test.tsx` (hydratation, flag jamais re-montré).
- [x] **AC6** — Sommet choisi en onb2 → visible comme sommet sélectionné au premier passage sur l'écran principal. Couvert par `SummitSlide.test.tsx` (commit au CTA via `SelectedPeakContext`).

Tous les ACs sont couverts par les tests automatiques (validate 100% vert). Les scénarios de test manuel simulateur ci-dessus restent à exécuter par l'utilisateur (rebuild natif requis, non testable en CI).

## Fix post-story — gap coins inférieurs illustration (test manuel iPhone 2026-07-24)

**Bug** : sur onb1 (Bienvenue), la mer de nuages (`MountainViz`, calques `cloudBack`/`cloudFront`) ne couvrait pas toute la largeur sur device physique → le fond était visible dans les deux coins inférieurs de l'illustration.

**Cause** : `src/components/onboarding/mountain-viz/MountainViz.tsx` — les calques nuage utilisaient un débord (overhang) trop faible en pourcentage (`left: -2%`/`width: 104%` pour le calque arrière, `-3%`/`106%` pour l'avant) pour absorber le drift animé (translateX fixe en px, jusqu'à ±8px). Sur un device réel avec une largeur d'écran plus petite (ex. iPhone SE, 320pt), 2% ≈ 6.4px < 8px de drift → le débord ne suffisait plus à couvrir la largeur à l'amplitude max du drift, exposant le fond dans les coins.

**Fix** : débord porté à `-6%`/`112%` sur les deux calques (`cloudBack` et `cloudFront`) — marge largement supérieure à l'amplitude de drift (±8px max) même sur les plus petits devices supportés (320pt × 6% ≈ 19px de marge). Purement une valeur de style, pas de dépendance à `useWindowDimensions` nécessaire vu la marge de sécurité désormais confortable sur toute la plage d'appareils iOS supportés.

**Fichier modifié** : `src/components/onboarding/mountain-viz/MountainViz.tsx` (styles `cloudBack`/`cloudFront` uniquement).

**Vérification** : `npm test -- src/components/onboarding/mountain-viz` (7/7 verts), `npx tsc --noEmit` et `npm run lint` propres. Vérification visuelle finale sur device physique nécessite un rebuild natif (`npx expo run:ios`) — non exécutée en CI/simulateur pour ce fix (changement de style pur, pas de module natif touché, mais l'observation initiale du bug vient d'un device physique donc la confirmation visuelle doit repasser par un device réel).

### Round 2 — le débord -6%/112% était insuffisant (revalidé sur device + simulateur, 2026-07-24)

Après rebuild device, le bug persistait : reproduit et confirmé visuellement sur simulateur (`iPhone 16 Pro`, onb1). Le fix round 1 corrigeait uniquement l'exposition du fond due au drift horizontal sur les bords gauche/droit de l'écran — pas la cause réelle observée : les deux tracés SVG `CLOUD_BACK`/`CLOUD_FRONT` sont des vagues dont le bord haut remonte par endroits (ex. `CLOUD_FRONT` atteint seulement `y=40` sur 80 à `x=0`), et la feuille de contenu (`WelcomeSlide`, `marginTop: -28`, coins arrondis 28px) chevauche le bas de l'illustration — dans cette bande de 28px, les deux coins arrondis de la feuille laissent transparaître le héro en dessous. Le remplissage plein n'y était pas garanti pixel-parfait, exposant le dégradé de ciel dans les deux coins.

**Fix round 2 (insuffisant)** : ajout d'un calque `View` opaque (`cloudBacking`) imbriqué *dans* l'`Animated.View` `sea` (celle qui porte l'animation de respiration `seaBreathe` et le positionnement `top: cloudTop%` dépendant du score), avec une hauteur relative (40% de `sea`). Toujours dépendant indirectement du score/de l'animation parente → sur device réel, toujours pris en défaut dans les mêmes coins.

**Fix round 3 (définitif)** : calque `View` opaque sorti de `sea` et ancré directement au conteneur racine de `MountainViz` — une bande fixe de hauteur `20%` du conteneur, plaquée au bas, indépendante du score/`cloudTop` et de toute animation. Rendue avant (donc visuellement sous) la mer de nuages animée, qui continue de se dessiner par-dessus pour la texture. Approche volontairement simple : plus de dépendance à la géométrie des tracés vague ni à un pourcentage relatif à un conteneur lui-même animé.

**Fichier modifié** : `src/components/onboarding/mountain-viz/MountainViz.tsx` (style `cloudBacking` déplacé au niveau du conteneur, hauteur fixée à `20%`, variable `cloudBackingFill`).

**Vérification round 3** : reproduit sur simulateur iOS (`iPhone 16 Pro`), fix confirmé résolu visuellement — plus aucun gap dans les coins, animation en cours incluse. `npm test -- src/components/onboarding/mountain-viz` (7/7 verts, 100% coverage), `npx tsc --noEmit`/`npm run lint` propres.

## Fix post-story — rectangle flou en bas de la liste de sommets sur onb2 (test manuel iPhone 2026-07-24)

**Bug** : sur onb2 (« Choisissez un sommet de référence »), un rectangle flou apparaissait en bas de la liste de sommets, juste avant le dock (mascotte + CTA) — plus visible en mode light.

**Cause** : `src/components/onboarding/summit-slide/SummitSlide.tsx` a son propre `LinearGradient` de fondu (`styles.fade`, dégradé `transparent` → `colors.background`, positionné en bas absolu de `listArea`) censé signaler qu'il reste du contenu à scroller. Ce fondu était affiché **inconditionnellement**, même quand les 6 sommets curés tiennent déjà entièrement dans la zone visible sans nécessiter de scroll — un fondu statique et sans fonction, perçu comme un rectangle flou parasite (plus visible en light du fait du contraste `colors.background` #EFE8DC vs `colors.surface` #F7F5F1 des lignes).

**Fix** : le fondu n'est désormais affiché que si le contenu de la liste dépasse réellement la hauteur visible (`isScrollable`, calculé via `onLayout` du conteneur + `onContentSizeChange` du `ScrollView`, comparant les deux hauteurs).

**Fichier modifié** : `src/components/onboarding/summit-slide/SummitSlide.tsx` (state `isScrollable`, ref `listAreaHeight`, rendu conditionnel de `LinearGradient`, testIDs `summit-list-area`/`summit-list-scroll`/`summit-list-fade` ajoutés pour les tests).

**Vérification** : `npm test -- src/components/onboarding/summit-slide` (16/16 verts, 100% coverage — 2 nouveaux tests couvrant fondu masqué/affiché), `npx tsc --noEmit`/`npm run lint` propres, suite complète `npm test` (98 suites / 694 tests verts). Confirmé résolu par test manuel utilisateur sur device physique.
