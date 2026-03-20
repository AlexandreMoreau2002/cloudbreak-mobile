# CLAUDE.md — Mobile

Règles spécifiques au sous-repo `cloudbreak-mobile`.
Les règles globales (architecture, git flow, modèle de données) sont dans le `CLAUDE.md` racine.

---

## Commandes

```bash
# Première fois ou après ajout de module natif
npx expo run:ios        # compile le build natif + lance Metro

# Fois suivantes (build déjà installé sur le simulateur)
npm start               # Metro uniquement

npm run validate        # tsc + lint + test --coverage + build:check — obligatoire avant commit
npm run lint            # ESLint
npx tsc --noEmit        # TypeScript
npm test                # Jest
npm test -- --watch     # mode watch
npm test -- --coverage  # avec couverture
npm run build:check     # expo export (vérifie que le bundle compile)
```

> Ne pas utiliser Expo Go — l'app a des modules natifs incompatibles.

---

## Imports — règle STRICTE

Ordre en escalier : longueur croissante, externes puis internes.

```ts
// ✅ Correct
import { Tabs } from 'expo-router';
import i18n from '@/utils/i18n';
import { useTheme } from '@/contexts/ThemeContext';

// ❌ Incorrect
import { useTheme } from '../../contexts/ThemeContext';
```

Alias @/ obligatoire — jamais de chemins relatifs ../ ou ../../.

---

## Règles de code

Ne jamais faire :
- Appels réseau dans les composants — uniquement dans les hooks
- try/catch dans les composants — uniquement dans les hooks
- Strings UI hardcodées — utiliser i18n.t('clé')
- Données sensibles dans AsyncStorage — utiliser expo-secure-store

Toujours faire :
- AsyncState<T> pour tout état asynchrone : idle | loading | success | error
- Vérifier le cache offline avant tout appel réseau
- if (DEBUG) console.debug(...) aux points clés

---

## Internationalisation (i18n)

Clés définies dans src/locales/fr.ts et src/locales/en.ts — ajouter dans les deux avant usage.

---

## Mode debug

```typescript
// src/constants/devConfig.ts
export const DEBUG = __DEV__ && true;

if (DEBUG) console.debug('[useScore] state', { peakId, state });
if (DEBUG) console.debug('[apiFetch] request', { url, params });
if (DEBUG) console.debug('[cache] result', { key, hit, age });
```

---

## Tests — règles

- 100% coverage sur les fichiers avec logique métier
- 1 fichier de test co-localisé par fichier source
- Tests de feature dans src/__tests__/features/
- npm run validate doit passer avant chaque commit

---

## Documentation — règles

| Document | Quand |
|----------|-------|
| docs/story-{epic}-{num}-{slug}.md | Chaque story |
| docs/product-audit.md | Après chaque story |
| docs/security.md | Si auth, storage, données utilisateur |
| README.md | Si installation ou structure changent |

---

## Agents à utiliser

Après chaque story :
- cloudbreak-dev-reviewer — patterns, ACs, doc
- cloudbreak-security — si auth, SecureStore, StoreKit
