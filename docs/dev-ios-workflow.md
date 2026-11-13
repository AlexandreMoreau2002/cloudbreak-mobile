# Workflow de dev iOS — Cloudbreak

Ce document explique comment faire tourner l'app sur le simulateur Mac et sur l'iPhone,
et quel backend utiliser pour chaque cas.

## 1. Les 4 morceaux (le concept)

Imagine l'app comme un **jeu vidéo** :

- **Le jeu installé** (l'app native) : c'est le fichier qu'Apple installe. Il contient le code
  « dur » (natif, écrit en Swift/Objective-C) et le moteur. Il ne change presque jamais.
- **Les niveaux** (le JavaScript) : ce sont les écrans, les boutons, la logique. Ils changent
  tout le temps. Ils ne sont **pas** dans le jeu installé, ils viennent d'un serveur.
- **Metro** : le serveur qui envoie les niveaux au jeu. C'est lui que lance `npm start`.
- **Le backend** : l'API qui donne les scores, les comptes, les achats. Il tourne ailleurs
  (sur ton Mac en Docker, ou sur ton serveur dev).

```text
┌──────────────────────────┐        ┌───────────────────────────┐
│ App native installée     │◀──────▶│ Metro (npm run start)     │
│ (sim Mac ou iPhone)      │  JS    │ envoie le JavaScript      │
│ - code natif (StoreKit)  │        └───────────────────────────┘
│ - écrans = JS reçu       │
└────────────┬─────────────┘
             │ HTTPS / HTTP  (URL = EXPO_PUBLIC_API_URL)
             ▼
┌──────────────────────────┐
│ Backend FastAPI          │  ← local (Docker sur Mac)
│ ou dev-api (serveur)     │  ← ou serveur dev
└──────────────────────────┘
```

Conséquence importante : **l'app native doit être installée une fois**. Metro ne peut
pas l'installer à ta place.

## 2. Les mots qui font peur

| Mot | En clair |
| --- | --- |
| **StoreKit 2** | L'API d'Apple pour les abonnements dans l'app. Ça ne sert pas à lancer l'app. |
| **react-native-iap** | Le pont entre notre JavaScript et StoreKit. C'est du **code natif**, donc il faut le compiler. |
| **Expo Go** | L'app « bac à sable » d'Expo qui contient déjà plein de modules natifs. Elle **ne contient pas** notre module StoreKit : Cloudbreak ne peut donc plus tourner dedans. |
| **Development build** (`expo-dev-client`) | Notre propre version de l'app, compilée une fois avec le module StoreKit. C'est elle qui remplace Expo Go. |
| **Build natif** (`npx expo run:ios`) | Compile la partie native et l'installe sur le simulateur. Lent (10–20 min la première fois). |
| **EAS** | Le service de build dans le cloud d'Expo. Utile seulement pour installer la build sur un iPhone **sans câble**. Pas besoin pour le simulateur. |
| **`eas.json`** | Les profils de build EAS (`development`, `preview`, `production`). |
| **`ios/`** | Le projet Xcode généré automatiquement. Il est ignoré par git, on ne le modifie pas à la main. |

## 3. Les commandes (une seule fois ou au quotidien)

### A. Une fois : installer l'app sur le simulateur

Pas besoin de relancer ça tous les jours. Refaire seulement si un module natif change
(ajout d'une lib comme `react-native-iap`, plugin Expo, `app.json`/`app.config.ts` natif).

```bash
cd ~/Desktop/dev/cloudbreak/mobile && npm run ios
```

`npm run ios` = `expo run:ios` : compile, installe Cloudbreak dans le simulateur et lance Metro.

### B. Au quotidien : développer les écrans

```bash
cd ~/Desktop/dev/cloudbreak/mobile && npm run start
```

Puis taper `i` dans le terminal Metro : Cloudbreak s'ouvre dans le simulateur.
Les changements de code se rechargent tout seuls.

### C. Au quotidien sur iPhone (Cloudbreak déjà installée)

```bash
cd ~/Desktop/dev/cloudbreak/mobile && npm run start -- --dev-client
```

Puis ouvrir Cloudbreak sur l'iPhone et scanner le QR code de Metro. Même Wi-Fi que le Mac requis.

### C bis. Après un changement dans `.env` (`EXPO_PUBLIC_*`)

Ces variables sont figées quand Metro compile le JavaScript. Il faut redémarrer Metro avec le cache vidé :

```bash
cd ~/Desktop/dev/cloudbreak/mobile && npm run start -- --clear
```

### D. Installer sur iPhone sans câble (EAS, exceptionnel)

Seulement pour la **première** installation sur l'iPhone, ou après un changement natif :

```bash
cd ~/Desktop/dev/cloudbreak/mobile && npm exec --yes eas-cli@latest -- build --profile development --platform ios
```

Le paquet s'appelle `eas-cli` : `npx eas` est incorrect dans ce projet.

## 4. Quel backend pour quel cas ?

La variable `EXPO_PUBLIC_API_URL` dit à l'app où est le backend. Elle est lue par **Metro**, pas
par l'iPhone : c'est le Mac qui envoie le JavaScript avec l'URL déjà inscrite dedans.

Le fichier `mobile/.env` contient les trois cibles, dont une seule est active :

| Où tourne l'app | URL à mettre | Backend utilisé | Quand l'utiliser |
| --- | --- | --- | --- |
| Simulateur Mac (actif par défaut) | `http://localhost:8000` | Local (Docker `make dev`) | Dev quotidien, debug |
| iPhone | `http://<IP Wi-Fi du Mac>:8000` | Local (Docker) | Tester le backend local depuis le téléphone |
| Simulateur ou iPhone | `https://dev-api.cloudbreak-app.com` | Serveur dev (branche `develop`) | Tester un déploiement sans rien lancer en local |

### Changer de cible sans éditer `.env`

Une variable passée à la commande est prioritaire sur `.env` :

```bash
cd ~/Desktop/dev/cloudbreak/mobile && EXPO_PUBLIC_API_URL=https://dev-api.cloudbreak-app.com npm run start -- --dev-client --clear
```

Pour revenir au backend local, relancer sans la variable (et avec `--clear`).

### Changer durablement

Éditer `mobile/.env` : décommenter la cible voulue et commenter l'ancienne, puis relancer
avec `--clear`. `.env.example` contient les mêmes cibles pour une nouvelle installation.

Le simulateur **partage le réseau du Mac** : `localhost` = le Mac. L'iPhone, lui, a son propre
`localhost` (le téléphone) : il faut donc l'IP du Mac.

Trouver l'IP Wi-Fi du Mac :

```bash
ipconfig getifaddr en0
```

### Le piège à connaître

- `EXPO_PUBLIC_*` est **figé au moment où Metro compile le JavaScript**. Changer `.env` ne suffit pas :
  il faut redémarrer Metro avec `--clear` :

  ```bash
  cd ~/Desktop/dev/cloudbreak/mobile && npm run start -- --clear
  ```

- `dev-api` tourne la branche `develop`. Les webhooks et routes StoreKit ne seront là
  qu'**après le merge** des PR backend #22. Donc pour tester les achats sur iPhone avant le merge,
  il faut le backend **local** avec ta branche `feature/4-3-storekit-2-abonnements`.

## 5. Schéma de décision

```text
Je veux tester…
│
├─ un écran, une navigation, du style   → simulateur : npm run start, puis i
│                                          backend : localhost:8000
│
├─ un écran sur iPhone                  → npm run start -- --dev-client
│                                          backend : IP Wi-Fi du Mac (local)
│
├─ un achat StoreKit (Sandbox)          → iPhone + backend LOCAL sur la branche
│                                          (dev-api pas encore à jour)
│
└─ l'app native a changé (nouveau module) → npm run ios  (simulateur)
                                           ou EAS build (iPhone)
```

## 6. Fichiers concernés

| Fichier | Rôle |
| --- | --- |
| `mobile/package.json` | Scripts `start`, `ios`, dépendance `expo-dev-client` |
| `mobile/app.json` / `app.config.ts` | Config native (bundle id, plugins, permissions) |
| `mobile/eas.json` | Profils de build EAS |
| `mobile/.env` | `EXPO_PUBLIC_API_URL`, flags de dev (non versionné) |
| `mobile/ios/` | Projet natif généré (ignoré par git) |
| `mobile/docs/dev-ios-workflow.md` | Ce document |
