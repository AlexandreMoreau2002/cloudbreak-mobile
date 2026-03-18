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
npm start              # dev server + QR code (Expo Go)
npm run ios            # simulateur iOS
npm run android        # émulateur Android
```

> Expo Go doit être à jour sur le téléphone pour correspondre à la version SDK du projet.

## Qualité & Tests

```bash
npm run validate       # ✅ tout valider d'un coup — à lancer avant chaque commit
```

Cette commande enchaîne dans l'ordre :
1. `npx tsc --noEmit` — 0 erreur TypeScript
2. `npm run lint` — 0 warning ESLint
3. `npm test -- --coverage` — tous les tests passent, coverage 100%
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
│   ├── _layout.tsx          # Root layout : fonts + ThemeProvider
│   ├── index.tsx            # Redirect → /(tabs)
│   └── (tabs)/
│       ├── _layout.tsx      # Tab bar (4 onglets)
│       ├── index.tsx        # Accueil
│       ├── search.tsx       # Recherche
│       ├── favorites.tsx    # Favoris
│       └── profile.tsx      # Profil
├── components/              # Composants réutilisables
├── contexts/
│   └── ThemeContext.tsx     # ThemeProvider + useTheme()
├── hooks/                   # Hooks métier (useScore, usePeaks...)
├── locales/
│   ├── fr.ts                # Traductions français
│   └── en.ts                # Traductions anglais
├── services/                # apiClient, cacheService
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
