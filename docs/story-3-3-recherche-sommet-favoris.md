# Story 3.3 — Recherche de Sommet & Favoris

_Complétée le 2026-03-22_

---

## Ce qui a été fait

### Fichiers créés

| Fichier | Rôle |
|---------|------|
| `src/hooks/usePeakSearch.ts` | Hook debounced pour la recherche autocomplete (min 2 chars, 300ms debounce) |
| `src/hooks/useFavorites.ts` | Hook CRUD favoris — liste, ajout, suppression, refresh |
| `src/app/(tabs)/search.tsx` | Écran recherche avec autocomplete, toggle favori, tri favoris en premier |
| `src/app/(tabs)/favorites.tsx` | Écran liste des favoris avec refresh au focus |
| `src/hooks/usePeakSearch.test.ts` | Tests hook usePeakSearch |
| `src/hooks/useFavorites.test.ts` | Tests hook useFavorites |
| `src/app/(tabs)/search.test.tsx` | Tests écran recherche (hint, tri favoris) |
| `src/app/(tabs)/favorites.test.tsx` | Tests écran favoris (vide, loading, data) |
| `src/services/api/peaks.test.ts` | Tests API peaks (search, fetchBySlug, fetchFavorites, removeFavorite) |
| `src/services/api/user.test.ts` | Tests API user (fetchSubscription, addFavorite) |

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/services/api/peaks.ts` | Ajout `fetchFavorites()`, `removeFavorite()` |
| `src/services/api/user.ts` | Ajout `addFavorite()` |
| `src/services/mockData/types.ts` | Centralisation `AsyncState<T>` (était dupliqué dans les hooks) |
| `src/locales/fr.ts` + `en.ts` | Ajout clés `search.*`, `favorites.*` |

---

## Comment ça fonctionne

### Recherche autocomplete (`usePeakSearch`)

```
TextInput → setQuery → debounce 300ms → query.length >= 2
  → GET /api/v1/peaks/search?q=... → AsyncState<Peak[]>
```

- Debounce 300ms pour éviter les appels à chaque frappe
- En dessous de 2 caractères : état `idle` + hint affiché
- Token Supabase via `useAuth()`

### Favoris (`useFavorites`)

```
mount / useFocusEffect → GET /api/v1/user/favorites → AsyncState<Peak[]>
addFavorite(peakId) → POST /api/v1/user/favorites → refresh()
removeFavorite(peakId) → DELETE /api/v1/user/favorites/{peakId} → refresh()
```

- `useFocusEffect` dans `favorites.tsx` : refresh automatique quand l'onglet redevient visible
- Les favoris sont mappés `favorite.peak` → `Peak` (le backend retourne les objets imbriqués)

### Tri favoris en premier (search.tsx)

```typescript
const favoriteIds = new Set((favState.data ?? []).map((p) => p.id));
const sorted = [...(state.data ?? [])].sort((a, b) => {
  return (favoriteIds.has(a.id) ? 0 : 1) - (favoriteIds.has(b.id) ? 0 : 1);
});
```

Tri client-side, pas de round-trip serveur supplémentaire.

### UI

- Ionicons `heart` (rempli, fond accent) si favori / `heart-outline` si non-favori
- Bordure accent sur la card si favori
- Badge altitude en gris
- Icône `×` (Ionicons `close`) pour supprimer dans les favoris
- État vide avec icône cœur barré + message i18n

---

## Comment tester

### Prérequis

- Backend en cours (`make dev` dans `cloudbreak/backend`)
- Token JWT valide (connexion dans l'app)

### Recherche

1. Aller sur l'onglet "Recherche"
2. Taper "m" → hint "Entrez au moins 2 caractères"
3. Taper "mo" → résultats s'affichent (Mont Blanc, etc.)
4. Tap sur le cœur → favori ajouté, cœur devient plein
5. Retaper "mo" → le sommet mis en favori apparaît en premier

### Favoris

1. Aller sur l'onglet "Favoris"
2. Si aucun favori → écran vide avec message
3. Ajouter un favori depuis recherche → revenir sur favoris → liste à jour (auto-refresh)
4. Tap sur `×` → favori supprimé

### Tests automatisés

```bash
npm test
# 65 tests — 0 failures
```

---

## Acceptance Criteria vérifiés

| AC | Description | Statut |
|----|-------------|--------|
| AC1 | Recherche min 2 chars (hint sinon) | ✅ |
| AC2 | Résultats en < 500ms (debounce 300ms + endpoint rapide) | ✅ |
| AC3 | Toggle favori depuis la recherche | ✅ |
| AC4 | Onglet Favoris affiche la liste | ✅ |
| AC5 | Suppression depuis les favoris | ✅ |
| AC6 | Favoris remontent en premier dans la recherche | ✅ |
| AC7 | Refresh auto au focus (useFocusEffect) | ✅ |
| AC8 | Tap sur un résultat → navigation vers écran de prévision | ⏳ Story 3.4 — l'écran `/peak/[slug]` n'existe pas encore |
