# cloudbreak-mobile

App mobile Cloudbreak — prédit la probabilité de mer de nuage depuis un sommet donné, à une date et heure précises.

## Stack

- **Expo SDK 55** + **React Native 0.83**
- **Expo Router** — navigation file-based
- **TypeScript 5.9**
- **Josefin Sans** — police principale
- **i18n-js** + **expo-localization** — traductions FR/EN

## Setup (première fois)

```bash
npm install
```

## Lancer en dev

```bash
npx expo run:ios       # première fois (ou après ajout d'un module natif) — compile + lance le simulateur
npm start              # fois suivantes — Metro bundler uniquement (le build natif est déjà installé)
```

> **Important** : l'app utilise des modules natifs (`AsyncStorage`, `expo-linear-gradient`...) incompatibles avec Expo Go. Il faut obligatoirement `npx expo run:ios` pour compiler le development build la première fois, ou après chaque ajout de module natif. Ensuite `npm start` suffit.

## Qualité & Tests

```bash
npx tsc --noEmit       # vérification TypeScript — 0 erreur attendue
npm run lint           # ESLint
npm test               # Jest
npm run build:check    # build check iOS + Android + Web (export statique)
```

## Structure

```
src/
├── app/
│   ├── _layout.tsx          # Root layout : fonts + ThemeProvider + AuthProvider + AuthGuard
│   ├── index.tsx            # Redirect → /(tabs)
│   ├── (auth)/
│   │   ├── _layout.tsx      # Layout routes non-auth (pas de guard)
│   │   └── login.tsx        # Écran login / inscription
│   └── (tabs)/
│       ├── _layout.tsx      # Tab bar (4 onglets)
│       ├── index.tsx        # Accueil
│       ├── search.tsx       # Recherche
│       ├── favorites.tsx    # Favoris
│       └── profile.tsx      # Profil + bouton déconnexion
├── components/              # Composants réutilisables
├── contexts/
│   ├── ThemeContext.tsx     # ThemeProvider + useTheme()
│   └── AuthContext.tsx      # AuthProvider + useAuth() — session Supabase
├── hooks/                   # Hooks métier (useScore, usePeaks...)
├── locales/
│   ├── fr.ts                # Traductions français
│   └── en.ts                # Traductions anglais
├── services/
│   ├── apiClient.ts         # Client HTTP backend
│   ├── cacheService.ts      # Cache offline
│   └── supabaseClient.ts    # Client Supabase (AsyncStorage)
├── constants/
│   ├── colors.ts            # Palette light/dark + scores
│   ├── typography.ts        # Josefin Sans, échelle 1.25×
│   ├── spacing.ts           # Grille 4px + radius
│   └── flags.ts             # Feature flags
└── utils/
    └── i18n.ts              # Instance i18n configurée
```

## Design system

| Token | Valeur |
|-------|--------|
| Background light | `#EFE8DC` |
| Background dark | `#1A1A1A` |
| Accent | `#B28C6E` |
| Font | Josefin Sans (300 / 400 / 600 / 700) |
| Grille | 4px — xs=4, sm=8, md=16, lg=24, xl=32 |
| Base font | 14px, échelle ×1.25 |

Le thème s'adapte automatiquement au mode système (light/dark) via `useTheme()`.

## Traductions

Les fichiers de traduction sont dans `src/locales/`. Pour ajouter une langue :
1. Créer `src/locales/es.ts` (par exemple)
2. L'importer dans `src/utils/i18n.ts`

## Documentation features

- [Setup squelette Expo](docs/story-1-3-setup-mobile.md)
- [Authentification Supabase](docs/story-2-1-auth-supabase.md)
