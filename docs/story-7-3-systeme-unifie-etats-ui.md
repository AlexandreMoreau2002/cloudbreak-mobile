# Story 7.3 — Système unifié états UI

## Ce qui a été fait

### Nouveaux composants créés

| Fichier | Rôle |
|---------|------|
| `src/components/error-state/ErrorState.tsx` | Composant générique d'état d'erreur (icône + titre + message + CTA primaire + CTA secondaire optionnel) |
| `src/components/error-state/index.ts` | Re-export |
| `src/components/error-state/ErrorState.test.tsx` | 10 tests (props, secondaryAction, actionTestID) |
| `src/components/loading-spinner/LoadingSpinner.tsx` | Spinner centré générique (ActivityIndicator wrappé) |
| `src/components/loading-spinner/index.ts` | Re-export |
| `src/components/loading-spinner/LoadingSpinner.test.tsx` | 4 tests (rendu, tailles, testID) |
| `src/components/favorites-skeleton/FavoritesSkeleton.tsx` | Skeleton loader animé pour la liste de favoris (3 items, Animated.loop) |
| `src/components/favorites-skeleton/index.ts` | Re-export |
| `src/components/favorites-skeleton/FavoritesSkeleton.test.tsx` | 5 tests (rendu, animation, items) |
| `src/components/async-state-view/AsyncStateView.tsx` | Composant de routing déclaratif : isLoading → loadingComponent, error → errorComponent, isEmpty → emptyComponent, sinon children |
| `src/components/async-state-view/index.ts` | Re-export |
| `src/components/async-state-view/AsyncStateView.test.tsx` | 8 tests (tous les états, defaults) |

### Complément — Skeleton Home par composant (post-implémentation)

Le skeleton unique `ScoreSkeleton` affiché seul pendant le chargement de la Home a été remplacé par un skeleton composite fidèle à chaque section réelle :

| Fichier | Reproduit |
|---------|-----------|
| `src/components/skeleton-block/SkeletonBlock.tsx` | Bloc animé partagé — effet shimmer (dégradé lumineux `expo-linear-gradient` qui balaye le bloc de droite à gauche en boucle, largeur mesurée via `onLayout`) |
| `src/components/skeleton-block/useSkeletonColor.ts` | Hook couleur des blocs skeleton (`#DCCEBB` light / `#474747` dark) — contraste volontairement plus marqué que `colors.border` pour que les blocs ressortent sur `surface` et `background` |
| `src/components/peak-header-skeleton/PeakHeaderSkeleton.tsx` | `PeakHeader` |
| `src/components/score-skeleton/ScoreSkeleton.tsx` (réécrit) | `ScoreCard` (structure actuelle, sans nom/altitude) |
| `src/components/week-strip-skeleton/WeekStripSkeleton.tsx` | `WeekStrip` |
| `src/components/conditions-skeleton/ConditionsSkeleton.tsx` | `ConditionsSection` (sans la carte d'alerte, conditionnelle) |
| `src/components/favorites-grid-skeleton/FavoritesGridSkeleton.tsx` | `FavoritesGrid` |
| `src/components/home-skeleton/HomeSkeleton.tsx` | Composeur — empile les 5 skeletons ci-dessus |

`src/app/(tabs)/index.tsx` utilise désormais `<HomeSkeleton />` seul aux deux endroits qui affichaient `<PeakHeader/> + <ScoreSkeleton/>` (loading initial et filet de sécurité cache partiel).

**Fidélité visuelle** : chaque section skeleton reprend le chrome de carte du composant réel qu'elle imite (`backgroundColor: colors.surface` + `borderColor: colors.border` + `borderWidth: 1` sur les pastilles de `WeekStripSkeleton`, les widgets de `ConditionsSkeleton`, les cartes de `FavoritesGridSkeleton` et les boutons ronds de `PeakHeaderSkeleton`) — sans ce chrome les blocs flottaient invisibles sur le fond de page. Voir le design complet dans `docs/superpowers/specs/2026-07-01-home-skeleton-par-composant-design.md` et le plan dans `docs/superpowers/plans/2026-07-01-home-skeleton-par-composant.md`.

### Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `src/locales/fr.ts` | Clés ajoutées : `common.networkHint`, `home.quotaUpgrade`, `home.discoverPro`, `home.notNow`, `search.minCharsHint`, `search.noResultsHint`, `favorites.emptyHint`, `favorites.errorTitle`, `favorites.goToSearch` |
| `src/locales/en.ts` | Mêmes clés en anglais |
| `src/app/(tabs)/favorites.tsx` | Réécriture complète — `AsyncStateView` + `FavoritesSkeleton` (loading) + `ErrorState` (erreur) + `EmptyState` (vide) |
| `src/app/(tabs)/favorites.test.tsx` | Mocks mis à jour avec pattern `require()` dans factories |
| `src/app/(tabs)/search.tsx` | Réécriture complète — `AsyncStateView` pour loading/erreur/vide dans `renderContent()` |
| `src/app/(tabs)/search.test.tsx` | Mocks mis à jour |
| `src/app/(tabs)/index.tsx` | Remplacement du bloc quota et erreur générique par `ErrorState` + state `quotaDismissed` |
| `src/app/(tabs)/index.test.tsx` | Tests quota mis à jour (43 tests) |
| `src/app/(auth)/login.tsx` | Bouton submit : `ActivityIndicator` à la place du texte pendant loading |
| `src/app/(auth)/login.test.tsx` | Test loading mis à jour |
| `src/components/profile/DeleteAccountModal.tsx` | `color="#fff"` → `color={colors.surface}` sur ActivityIndicator |

## Comment ça fonctionne

### ErrorState

Composant présentationnel. Props :

```tsx
interface ErrorStateProps {
  icon?: string;               // nom Ionicons, default: 'cloud-offline-outline'
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  actionTestID?: string;       // testID sur le bouton primaire
  secondaryAction?: { label: string; onPress: () => void };
}
```

Usage quota Home : `secondaryAction={{ label: i18n.t('home.notNow'), onPress: () => setQuotaDismissed(true) }}` — quand cliqué, le state `quotaDismissed` passe à `true`, la carte quota est skippée, et si des données sont en cache elles s'affichent immédiatement (expérience "info, pas bloquant").

### AsyncStateView

```tsx
interface AsyncStateViewProps {
  isLoading: boolean;
  isEmpty?: boolean;
  error?: string | null;
  loadingComponent?: ReactNode;   // fallback : <LoadingSpinner />
  emptyComponent?: ReactNode;
  errorComponent?: ReactNode;     // fallback : null
  children?: ReactNode;
}
```

Priorité : `isLoading` > `error` > `isEmpty` > `children`.

### Pattern jest.mock factories

Les factories `jest.mock()` sont hoistées avant la résolution des imports. Pour accéder à `React`, `Text`, `View` il faut les `require()` à l'intérieur de la fonction mock :

```tsx
jest.mock('@/components/error-state', () => ({
  ErrorState: function MockErrorState(props: { title: string }) {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, props.title);
  },
}));
```

## Comment tester

### Tests automatiques

```bash
cd mobile
npm test                        # 473 tests, tous PASS
npm run lint                    # 0 erreurs (14 warnings require() — pattern jest obligatoire)
npx tsc --noEmit                # 0 erreurs TypeScript
npm run build:check             # expo export OK
```

### Test manuel iOS

1. **Loading skeleton favoris** — onglet Favoris au démarrage (avant la réponse API)
2. **Empty state favoris** — sans favoris → message + CTA "Rechercher un sommet"
3. **Error state favoris** — couper le réseau + recharger → titre `favorites.errorTitle` + bouton retry
4. **Loading skeleton home** — sélectionner un sommet → `HomeSkeleton` (PeakHeader + ScoreCard + WeekStrip + Conditions + FavoritesGrid) pendant le fetch, chaque section a son équivalent skeleton fidèle
5. **Erreur générique home** — couper le réseau + sélectionner un sommet → `ErrorState` avec `common.networkHint`
6. **Quota card** — atteindre la limite journalière → card avec bouton "Découvrir Pro" + bouton "Pas maintenant"
7. **Pas maintenant** → dismiss de la carte, le sommet déjà chargé reste affiché en cache
8. **Login spinner** — entrer des credentials et soumettre → `ActivityIndicator` dans le bouton

## Acceptance Criteria vérifiés

- [x] `ErrorState` affiche icône, titre, message, CTA primaire avec testID, CTA secondaire
- [x] `LoadingSpinner` centré, couleur accent, size configurable
- [x] `FavoritesSkeleton` animé, 3 items, hauteur cohérente avec la liste réelle
- [x] `HomeSkeleton` — chaque composant réel de la Home (PeakHeader, ScoreCard, WeekStrip, ConditionsSection, FavoritesGrid) a son équivalent skeleton fidèle, assemblés dans le bon ordre
- [x] `AsyncStateView` route vers le bon état selon props
- [x] `EmptyState` existant branché sur favorites (était défini mais jamais utilisé)
- [x] Favorites : loading → skeleton, error → `ErrorState` + retry, empty → `EmptyState` + CTA, success → liste
- [x] Search : loading → spinner, error → `ErrorState`, empty → `EmptyState` ou hint selon cas
- [x] Home quota : `ErrorState` avec `secondaryAction` "Pas maintenant" qui ferme la carte sans perdre le cache
- [x] Home erreur générique : `ErrorState` unifié (suppression de la distinction 503 vs générique)
- [x] Login : `ActivityIndicator` dans le bouton submit pendant loading
- [x] `DeleteAccountModal` : couleur spinner depuis le thème, plus de hardcoded `#fff`
- [x] Toutes les clés i18n ajoutées en FR et EN
- [x] 473 tests pass, 0 erreurs lint/tsc, build check OK
