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

### Dépannage simulateur iOS

```bash
# Tuer tous les simulateurs
killall "Simulator" 2>/dev/null; xcrun simctl shutdown all

# Effacer complètement un simulateur (si corrompu/bloqué)
xcrun simctl erase <UDID>
# Trouver l'UDID : xcrun simctl list devices | grep "iPhone 16 Pro"

# Forcer Metro sur localhost (si timeout exp://192.x.x.x)
npm start -- --localhost --clear
```

Important :
- `Cmd+Q` ferme souvent seulement l'UI de `Simulator.app`
- le device simulé peut rester `Booted` en arrière-plan via `CoreSimulator`
- si Claude constate que le simulateur "ne se ferme jamais", utiliser cette séquence complète :

```bash
killall Simulator
xcrun simctl shutdown all
killall -9 com.apple.CoreSimulator.CoreSimulatorService
```

- utiliser cette séquence avant d'investiguer un bug Expo/React Native si le souci ressemble à un simulateur bloqué
- après ce reset, relancer proprement avec `npx expo run:ios` ou `npm start` selon le cas

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

## Composants UI états — règle STRICTE

Pour tout écran ou section qui charge des données, utiliser **obligatoirement** ces composants :

| Besoin | Composant | Import |
|--------|-----------|--------|
| État d'erreur (réseau, API, quota) | `ErrorState` | `@/components/error-state` |
| Spinner générique (bouton submit, chargement inline) | `LoadingSpinner` | `@/components/loading-spinner` |
| État vide (liste vide, aucun résultat) | `EmptyState` | `@/components/empty-state` |
| Routing déclaratif loading/error/empty/data | `AsyncStateView` | `@/components/async-state-view` |
| Skeleton liste favoris | `FavoritesSkeleton` | `@/components/favorites-skeleton` |
| Skeleton écran Home complet | `HomeSkeleton` | `@/components/home-skeleton` |

**Ne jamais faire :**
```tsx
// ❌ états inline
{loading && <ActivityIndicator />}
{error && <Text>Erreur</Text>}
{data.length === 0 && <Text>Vide</Text>}
```

**Toujours faire :**
```tsx
// ✅ composants unifiés
<AsyncStateView
  isLoading={state.status === 'loading'}
  error={state.status === 'error' ? state.error : null}
  isEmpty={state.status === 'success' && items.length === 0}
  loadingComponent={<FavoritesSkeleton />}
  emptyComponent={<EmptyState icon="heart-outline" title={i18n.t('favorites.empty')} />}
  errorComponent={<ErrorState title={i18n.t('favorites.errorTitle')} action={{ label: i18n.t('common.retry'), onPress: reload }} />}
>
  <FlatList data={items} ... />
</AsyncStateView>
```

**`ErrorState` — props disponibles :**
```tsx
<ErrorState
  icon="cloud-offline-outline"   // Ionicons, optionnel
  title="..."                    // obligatoire
  message="..."                  // optionnel
  action={{ label, onPress }}    // CTA primaire
  actionTestID="..."             // pour les tests
  secondaryAction={{ label, onPress }}  // ex: "Pas maintenant" — dismissable sans bloquer
/>
```

**Règle quota/info :** une carte quota n'est jamais bloquante — toujours proposer un `secondaryAction` "Pas maintenant" qui dismiss la carte et revient aux données déjà en cache.

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
