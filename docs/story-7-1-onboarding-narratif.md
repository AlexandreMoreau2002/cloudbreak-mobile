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
