# Story 1-3 — Setup Mobile Expo

**Date** : 2026-03-18
**Status** : done
**Stack** : Expo SDK 55, React Native 0.83, TypeScript 5.9, Expo Router

---

## Ce qui a été mis en place

### Structure des dossiers

```
mobile/src/
├── app/
│   ├── _layout.tsx          # Root layout : fonts + ThemeProvider + Stack
│   └── (tabs)/
│       ├── _layout.tsx      # Tab bar : 4 onglets avec Ionicons
│       ├── index.tsx        # Accueil (placeholder)
│       ├── search.tsx       # Recherche (placeholder)
│       ├── favorites.tsx    # Favoris (placeholder)
│       └── profile.tsx      # Profil (placeholder)
├── constants/
│   ├── colors.ts            # Palette light/dark + scores
│   ├── typography.ts        # Josefin Sans, échelle 1.25×
│   ├── spacing.ts           # Grille 4px + radius
│   └── flags.ts             # Feature flags (vide en MVP)
├── contexts/
│   └── ThemeContext.tsx     # ThemeProvider + useTheme()
└── utils/
    └── i18n.ts              # i18n-js + expo-localization (FR défaut, EN)
```

### Design system

| Token | Valeur |
|-------|--------|
| Font principale | Josefin Sans (300/400/600/700) |
| Background light | `#EFE8DC` |
| Background dark | `#1A1A1A` |
| Accent | `#B28C6E` |
| Grille | 4px (xs=4, sm=8, md=16, lg=24, xl=32) |
| Base font | 14px, échelle ×1.25 |

### ThemeContext

`useTheme()` expose : `colors`, `spacing`, `typography`, `radius`, `scheme`.

Adapte automatiquement le thème au mode système (light/dark).

### i18n

Langues supportées : `fr` (défaut), `en`.
Accès via `t('key')` importé de `src/utils/i18n.ts`.

---

## Commandes qualité

```bash
npm run lint        # ESLint (expo lint)
npx tsc --noEmit    # TypeScript
npm test            # Jest (jest-expo preset)
npx expo export     # Build check
```

---

## Fix notable

`ThemeColors` défini comme type explicite avec `string` (et non `typeof Colors.light`)
pour éviter l'erreur TS2322 causée par l'union de literal types avec `as const`.

---

## Dépendances ajoutées

- `@expo-google-fonts/josefin-sans`
- `expo-localization`
- `i18n-js`
- `jest`, `jest-expo`, `@types/jest` (dev)
- `eslint`, `eslint-config-expo` (dev)
