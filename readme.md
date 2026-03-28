# cloudbreak-mobile

App mobile Cloudbreak — prédit la probabilité de mer de nuage depuis un sommet donné, à une date et heure précises.

## Stack

- **Expo SDK 55** + **React Native 0.83**
- **Expo Router** — navigation file-based
- **TypeScript 5.9**
- **Josefin Sans** — police principale
- **i18n-js** + **expo-localization** — traductions FR/EN
- **React 19.2** + `react-test-renderer` pour les tests RN

## Setup (première fois)

```bash
npm install
```

## Lancer en dev

```bash
# Première fois ou après ajout de module natif
npx expo run:ios       # compile le build natif + lance Metro

# Fois suivantes (build déjà installé sur le simulateur)
npm start              # Metro uniquement
```

> Ne pas utiliser Expo Go — l'app a des modules natifs incompatibles (AsyncStorage, expo-linear-gradient).

## Qualité & Tests

```bash
npm run validate       # ✅ tout valider d'un coup — à lancer avant chaque commit
```

Cette commande enchaîne dans l'ordre :
1. `npx tsc --noEmit` — 0 erreur TypeScript
2. `npm run lint` — 0 warning ESLint
3. `npm test -- --coverage` — suite Jest React Native
4. `npm run build:check` — le bundle iOS compile sans erreur

Commandes individuelles si besoin :
```bash
npx tsc --noEmit       # TypeScript uniquement
npm run lint           # ESLint uniquement
npm test               # Jest uniquement
npm run build:check    # build check uniquement
```

## Structure

```
src/
├── app/
│   ├── _layout.tsx          # Root layout : fonts + ThemeProvider + LanguageProvider + AuthGuard
│   ├── index.tsx            # Redirect → /(tabs)
│   └── (tabs)/
│       ├── _layout.tsx      # Tab bar (4 onglets)
│       ├── index.tsx        # Accueil : ScoreCard + WeekStrip + conditions + favoris
│       ├── search.tsx       # Recherche
│       ├── favorites.tsx    # Favoris
│       └── profile.tsx      # Profil
├── components/              # Composants réutilisables
│   └── cloud-layer-viz/     # Primitives de visualisation couche nuageuse
├── contexts/
│   ├── ThemeContext.tsx     # ThemeProvider + useTheme()
│   ├── LanguageContext.tsx  # FR/EN + toggleLocale()
│   └── SelectedPeakContext.tsx
├── hooks/                   # Hooks métier (useWeekData, usePeaks...)
├── locales/
│   ├── fr.ts                # Traductions français
│   └── en.ts                # Traductions anglais
├── services/
│   ├── fetchService.ts      # API_BASE + apiFetch<T>() + re-exports types
│   ├── mockData/            # Données statiques pour dev offline
│   │   ├── types.ts
│   │   ├── user.ts
│   │   ├── peaks.ts
│   │   └── score.ts
│   └── api/                 # Couche par domaine métier
│       ├── score.ts         # fetchScore() + normalisation du contrat backend
│       ├── peaks.ts         # searchPeaks(), fetchPeakBySlug()
│       ├── user.ts          # fetchUserSubscription(), updateNotificationPreferences(), updatePushToken(), addFavorite()
│       └── validations.ts   # postTerrainValidation()
├── constants/
│   ├── colors.ts            # Palette light/dark + scores
│   ├── typography.ts        # Josefin Sans, échelle 1.25×
│   ├── spacing.ts           # Grille 4px + radius
│   └── devConfig.ts         # MOCK_API, DEBUG (via EXPO_PUBLIC_*)
└── utils/
    └── i18n.ts              # Instance i18n configurée
```

## Mode mock (dev offline)

Le backend et Supabase ne sont pas requis pour développer le mobile.

```bash
# .env.local
EXPO_PUBLIC_MOCK_API=true   # active les données mockées
EXPO_PUBLIC_API_URL=http://localhost:8000
```

Avec `MOCK_API=true`, tous les appels réseau sont remplacés par des données statiques. Les fonctions mock sont définies dans `src/services/api/` (score.ts, peaks.ts, user.ts, validations.ts) et retournent les données de `src/services/mockData/` : sommets, scores, user, abonnement. Changer la variable et relancer Metro pour basculer.

---

## Design system

| Token | Valeur |
|-------|--------|
| Background light | `#EFE8DC` |
| Background dark | `#1A1A1A` |
| Accent | `#B28C6E` |
| Font | Josefin Sans (300 / 400 / 600 / 700) |
| Grille | 4px — xs=4, sm=8, md=16, lg=24, xl=32 |
| Base font | 14px, échelle ×1.25 |

Le thème s'adapte automatiquement au mode système (light/dark) via `useTheme()`. Un toggle manuel est disponible sur la page Profil. Pas de persistance — l'app suit toujours le réglage système au lancement.

## Traductions

Les fichiers de traduction sont dans `src/locales/`.

- Le backend renvoie des codes stables (`label_code`, `context_code`, `context_params`).
- La traduction et le rerender au changement de langue passent par `src/services/mockData/score.ts` et `LanguageContext`.
- `AppStack` est keyé sur `locale` pour rerendre proprement les écrans.

Pour ajouter une langue :
1. Créer `src/locales/es.ts` (par exemple)
2. L'importer dans `src/utils/i18n.ts`
3. Étendre `LanguageContext` si la langue doit être selectable dans l'UI

## Documentation features

- [Setup squelette Expo](docs/story-1-3-setup-mobile.md)
- [Authentification Supabase](docs/story-2-1-auth-supabase.md)
- [Hors-sprint — Thème, navigation, login](docs/hors-sprint-ui-foundations.md)
- [Story 3.4 — ScoreCard écran principal](docs/story-3-4-scorecard-ecran-principal.md)
- [Story 3.5 — Détail conditions, fenêtre, stabilité](docs/story-3-5-detail-conditions-fenetre-stabilite.md)
- [Refactorisation i18n score](docs/story-refacto-i18n-score.md)

## Dette technique connue

| Item | Fichier | Action |
|------|---------|--------|
| Supabase "Confirm email" désactivé | Supabase dashboard | Réactiver avant release 1.0.0 |
| `MountainBackground` visuellement insuffisant | `src/components/MountainBackground.tsx` | Rework visuel avant release 1.0.0 |
