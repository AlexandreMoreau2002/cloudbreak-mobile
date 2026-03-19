# Hors-sprint — Fondations UI (thème, navigation, login)

**Date** : 2026-03-19
**Status** : done
**Scope** : améliorations UI réalisées entre les stories officielles du sprint

---

## Ce qui a été fait

| Fichier | Rôle |
|---------|------|
| `src/contexts/ThemeContext.tsx` | Ajout `toggleScheme` + détection thème système iOS |
| `src/app/(tabs)/_layout.tsx` | Refonte visuelle de la tab bar |
| `src/app/(tabs)/profile.tsx` | Bouton toggle dark/light mode |
| `src/components/MountainBackground.tsx` | Illustration décorative login (v1 — à retravailler) |
| `src/app/(auth)/login.tsx` | Intégration `MountainBackground` en fond |
| `src/locales/fr.ts` + `en.ts` | Clés `profile.darkMode` + `profile.lightMode` |
| `app.config.ts` | `userInterfaceStyle: 'automatic'` pour dark mode natif iOS |
| `src/app/(tabs)/_layout.test.tsx` | Tests tab bar (créé, coverage 100%) |
| `src/components/MountainBackground.test.tsx` | Tests illustration login |

---

## 1. Système de thème dark/light

### Ce qui a changé

`ThemeContext` expose maintenant un `toggleScheme` permettant de basculer manuellement entre light et dark, sans persistance (l'override est en mémoire uniquement — à chaque relance de l'app, le thème système reprend la main).

**Décision intentionnelle** : pas de persistance AsyncStorage du choix de thème. L'app suit le réglage système. Le toggle manuel sert uniquement pour les tests visuels et la page profil.

### Détection thème système iOS

`app.config.ts` inclut `userInterfaceStyle: 'automatic'` — requis pour qu'iOS transmette correctement le mode dark/light à `useColorScheme()`. Sans cette config, l'app reste bloquée en light peu importe le réglage système.

> ⚠️ Un rebuild natif (`npx expo run:ios`) est nécessaire après ce changement — `npm start` seul ne suffit pas.

### Toggle manuel (page profil)

Un bouton sur `profile.tsx` permet de tester visuellement les deux thèmes sans changer le réglage du device. Affiche `profile.darkMode` ou `profile.lightMode` selon le thème actif.

---

## 2. Tab bar redesignée

### Ce qui a changé

La tab bar a été refaite pour correspondre à la direction artistique du projet.

| Propriété | Valeur |
|-----------|--------|
| Icônes | `@expo/vector-icons` Feather (home, search, heart, user) |
| Labels | Uppercase, `letterSpacing: 1.5`, `fontSize: 9` |
| Hauteur | 80px (`paddingBottom: 16`, `paddingTop: 12`) |
| Couleur active | `colors.accent` (`#B28C6E`) |
| Couleur inactive | `colors.textDisabled` |
| Fond | `colors.surface` avec bordure `colors.border` en haut |

Tous les tokens viennent du design system (`useTheme()`) — aucune valeur hardcodée.

---

## 3. Illustration login — MountainBackground (v1)

### Ce qui a été fait

Composant `MountainBackground` ajouté sur `login.tsx` — silhouette montagne + nappes horizontales simulant une mer de nuage, dessiné en pur React Native (triangles CSS via `borderWidth`, pas de SVG ni de librairie externe).

### État actuel : **dette visuelle connue**

> ⚠️ Le rendu actuel est insuffisant visuellement. Le composant sera retravaillé dans une future itération (probablement en story dédiée UX avant la release 1.0.0).

Ce qui manque :
- Les couleurs sont hardcodées (`#B28C6E`, `#8A6A50`, `#D2BA9C`) — à brancher sur le design system
- L'effet "mer de nuage" manque de profondeur et de fluidité
- Aucune adaptation au thème dark

---

## Comment tester

```bash
npm run validate   # 0 erreur, coverage 100%
npx expo run:ios   # rebuild natif requis (userInterfaceStyle)
```

**Thème :**
1. Changer le réglage dark/light dans Réglages iOS → Accessibilité → Affichage → Mode sombre
2. L'app bascule automatiquement
3. Ou utiliser le bouton toggle sur la page Profil

**Tab bar :**
- Naviguer entre les 4 onglets — icônes Feather, labels uppercase

**Login :**
- L'illustration montagne est visible en transparence (opacity 0.15) derrière le formulaire

---

## Dette technique notée

| Item | Priorité | Action |
|------|----------|--------|
| `MountainBackground` visuellement insuffisant | Moyenne | Story dédiée avant release 1.0.0 |
| Couleurs `MountainBackground` hardcodées | Basse | Corriger lors du rework visuel |
| Pas d'adaptation dark mode dans `MountainBackground` | Basse | Corriger lors du rework visuel |
