# Story 7.2 — Mode Offline-Light & Cache TTL

## Ce qui a été fait

### Fichiers modifiés

| Fichier | Rôle |
|---------|------|
| `src/hooks/useWeekData.ts` | TTL du cache AsyncStorage étendu à 3h ; ajout de la détection réseau via `@react-native-community/netinfo` ; nouveaux retours `fromCache` (booléen) et `cachedAt` (timestamp) exposés par le hook ; nouvelle fonction `refresh()` qui force un fetch réseau en bypassant le cache ; nouveau code d'erreur `OFFLINE_NO_CACHE` (cache absent/expiré + pas de réseau) |
| `src/components/offline-banner/OfflineBanner.tsx` | Nouveau composant présentationnel — bandeau "Données de Xh38 · connexion requise pour actualiser" affiché au-dessus du contenu quand `fromCache: true` |
| `src/components/offline-banner/OfflineBanner.test.tsx` | Tests du composant (rendu, formatage de l'ancienneté du cache) |
| `src/components/offline-banner/index.ts` | Re-export |
| `src/app/(tabs)/index.tsx` | Pull-to-refresh (`RefreshControl`) branché sur `refresh()` ; affichage conditionnel de `<OfflineBanner />` ; nouvel état vide pour `OFFLINE_NO_CACHE` via `EmptyState` (sans CTA, puisqu'aucune action réseau n'est possible hors-ligne) |
| `src/app/(tabs)/index.test.tsx` | Tests mis à jour (bandeau offline, pull-to-refresh, état `OFFLINE_NO_CACHE`) |
| `src/locales/fr.ts` / `src/locales/en.ts` | Clés ajoutées : `home.offlineBanner`, `home.offlineNoCacheTitle`, `home.offlineNoCacheMessage` |
| `package.json` | Nouvelle dépendance `@react-native-community/netinfo` |

## Comment ça fonctionne

Le cache AsyncStorage garde les données météo d'un sommet pendant **3h** (TTL étendu depuis 30min).

**Hors-ligne avec cache valide** : si l'utilisateur perd le réseau mais a déjà consulté ce sommet dans les 3h précédentes, `useWeekData` détecte l'absence de réseau (NetInfo), ne tente pas d'appel réseau voué à l'échec, et retourne directement les données en cache avec `fromCache: true` et `cachedAt` (timestamp du dernier fetch réussi). L'écran affiche ces données normalement, avec un bandeau `OfflineBanner` au-dessus indiquant l'ancienneté ("Données de 1h38 · connexion requise pour actualiser").

**Hors-ligne sans cache (ou cache expiré)** : si le cache est absent ou dépassé 3h ET qu'il n'y a pas de réseau, le hook retourne l'erreur `OFFLINE_NO_CACHE` plutôt que de tenter un fetch qui échouerait. L'écran affiche un `EmptyState` clair ("Données non disponibles — connexion requise pour voir une prévision fraîche"), sans bouton d'action puisqu'aucune action n'est possible sans réseau.

**Pull-to-refresh** : tirer l'écran vers le bas appelle `refresh()`, qui force un nouveau fetch réseau en bypassant le cache. Si le réseau est revenu, les données fraîches remplacent le cache, `fromCache` repasse à `false` et le bandeau disparaît. Si le réseau est toujours absent, le fetch échoue silencieusement et les données déjà affichées (issues du cache) restent inchangées — pas de message d'erreur intrusif, décision produit explicite pour ne pas casser une expérience déjà dégradée.

```
┌─────────────────────────────────────────────┐
│  Réseau dispo ?                              │
│    OUI → fetch normal → cache mis à jour     │
│    NON → cache valide (<3h) ?                │
│            OUI → affiche cache + bandeau     │
│            NON → OFFLINE_NO_CACHE (EmptyState)│
└─────────────────────────────────────────────┘
```

## Comment tester

### Tests automatiques

```bash
cd mobile
npm run validate    # tsc + lint + test --coverage + build:check
```

### Test manuel iOS

1. `npm start` puis sélectionner un sommet dans l'app
2. Couper le réseau (mode avion sur le simulateur/device, ou throttling réseau)
3. Si un fetch a déjà réussi dans les 3h précédentes pour ce sommet : le bandeau offline doit apparaître au-dessus de la `ScoreCard`, avec l'ancienneté du cache
4. Pour tester le cas `OFFLINE_NO_CACHE` : vider le cache AsyncStorage (`AsyncStorage.clear()` en dev), ou changer de sommet jamais consulté, puis couper le réseau avant le premier chargement → l'`EmptyState` "Données non disponibles" doit s'afficher, sans bouton
5. Tirer l'écran vers le bas (pull-to-refresh) une fois le réseau rétabli → le bandeau doit disparaître et les données se rafraîchir
6. Tirer l'écran vers le bas toujours hors-ligne → aucun crash, aucune erreur intrusive, les données affichées restent identiques

## Acceptance Criteria vérifiés

- [x] **AC1** — Prévision consultée avec réseau → mise en cache avec TTL 3h, disponible hors-ligne ensuite. Couvert par `useWeekData.test.ts` (écriture cache + TTL 3h).
- [x] **AC2** — Même prévision consultée sans réseau → cache retourné (`fromCache: true`), bandeau "Données du [heure] — connexion requise pour actualiser" affiché en < 100ms. Couvert par `useWeekData.test.ts` (`fromCache`/`cachedAt`), `OfflineBanner.test.tsx` (rendu du bandeau) et `index.test.tsx` (affichage conditionnel dans l'écran).
- [x] **AC3** — Cache expiré (> 3h) et absence de réseau → message clair "Données non disponibles", pas de crash, pas de données obsolètes affichées sans avertissement. Couvert par `useWeekData.test.ts` (code `OFFLINE_NO_CACHE`) et `index.test.tsx` (état `EmptyState` sans CTA).
- [x] **AC4** — Retour du réseau + pull-to-refresh → données fraîches récupérées, bandeau disparaît. Couvert par `useWeekData.test.ts` (`refresh()` bypasse le cache) et `index.test.tsx` (pull-to-refresh déclenche `refresh()`).
