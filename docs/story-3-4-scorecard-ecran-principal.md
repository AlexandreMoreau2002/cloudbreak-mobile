# Story 3.4 — ScoreCard : écran principal

_Complétée le 2026-03-23_

---

## Ce qui a été fait

### Fichiers créés

| Fichier | Rôle |
|---------|------|
| `src/components/ScoreCard.tsx` | Composant d'affichage du score mer de nuage (score %, verdict coloré, nom du sommet, altitude, date) |
| `src/components/ScoreCard.test.tsx` | Tests unitaires ScoreCard (high/medium/low/none, date invalide, testID) |
| `src/components/ScoreSkeleton.tsx` | Skeleton loader animé (pulsation) affiché pendant le chargement |
| `src/contexts/SelectedPeakContext.tsx` | Context React partagé : sommet sélectionné, date ISO, heure (6h par défaut) |
| `src/contexts/SelectedPeakContext.test.tsx` | Tests unitaires SelectedPeakContext (valeurs par défaut, setSelectedPeak, setSelectedDate) |
| `src/hooks/useScore.ts` | Hook asynchrone : fetch score API + cache AsyncStorage TTL 2h + gestion erreurs |
| `src/hooks/useScore.test.ts` | Tests unitaires useScore (idle, success, error, 503, cache hit, cache expiré, cache absent) |

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/app/(tabs)/index.tsx` | Écran principal : invite si pas de sommet, ScoreSkeleton pendant loading, ScoreCard en success, message d'erreur |
| `src/app/(tabs)/index.test.tsx` | Tests écran principal (invite, skeleton, scorecard, erreur) |
| `src/app/(tabs)/search.tsx` | Ajout `onPress` sur chaque item : `setSelectedPeak` + `router.push` vers home |
| `src/app/(tabs)/favorites.tsx` | Wrapper item en `TouchableOpacity` + `setSelectedPeak` + `router.push` vers home |
| `src/services/mockData/types.ts` | Ajout de `'none'` dans l'union `verdict` de `ScoreResponse` |
| `src/constants/colors.ts` | Ajout de `Colors.score.none: '#9E9E9E'` |
| `src/locales/fr.ts` | Ajout de `score.none: 'Nuages au sol'` |
| `src/locales/en.ts` | Ajout de `score.none: 'Clouds at base'` |

---

## Comment ça fonctionne

### Flux de données

```
HomeScreen
  ↓ useSelectedPeak() — lit le sommet sélectionné depuis SelectedPeakContext
  ↓ useScore(peakId, date, hour, token) — hook asynchrone
      ↓ AsyncStorage.getItem(cache:score:{peakId}:{date}:{hour})
          → cache valide (< 2h) → setState success (sans appel réseau)
          → cache absent ou expiré → fetchScore(token, peakId, date, hour)
              → success → setItem AsyncStorage + setState success
              → erreur 503 → setState error "Service momentanément indisponible"
              → autre erreur → setState error "Erreur de chargement"
  ↓ renderContent()
      → selectedPeak null → invite "Choisissez un sommet"
      → status loading → <ScoreSkeleton />
      → status error → message d'erreur (service ou générique)
      → status success → <ScoreCard score={data} date={selectedDate} />
```

### ScoreCard

- Affiche le score en grand (hero 72px) avec couleur selon le verdict
- Verdict pill avec fond coloré semi-transparent (18% opacité)
- Verdicts : `high` (#4CAF50) / `medium` (#FF9800) / `low` (#F44336) / `none` (#9E9E9E)
- Date formatée en français (`dimanche 23 mars 2026`) — fallback sur la chaîne brute si invalide

### Cache offline

- Clé Redis : `cache:score:{peakId}:{date}:{hour}`
- TTL : 2 heures
- Désactivé si `MOCK_API: true` (inutile en dev avec données fictives)
- Échec de lecture/écriture du cache est non-fatal → l'appel réseau est effectué

### SelectedPeakContext

- Stocke `selectedPeak`, `selectedDate` (ISO du jour par défaut), `selectedHour` (6 par défaut)
- Fourni au niveau du layout `_layout.tsx` → accessible depuis tous les onglets
- La `SearchScreen` appelle `setSelectedPeak()` après sélection → HomeScreen se met à jour

---

## Comment tester

### Tests automatiques

```bash
cd /Users/alex/Desktop/dev/cloudbreak/mobile
npm test -- --no-coverage
```

Fichiers de test couverts :
- `src/components/ScoreCard.test.tsx`
- `src/components/ScoreSkeleton.test.tsx` (si créé)
- `src/contexts/SelectedPeakContext.test.tsx`
- `src/hooks/useScore.test.ts`
- `src/app/(tabs)/index.test.tsx`

### TypeScript

```bash
cd /Users/alex/Desktop/dev/cloudbreak/mobile
npx tsc --noEmit
```

### Test manuel sur simulateur

**Prérequis** : backend en cours d'exécution (`make dev` dans `backend/`).

1. Lancer Metro : `npm start` (ou `npx expo run:ios` si premier lancement)
2. Se connecter avec un compte de test
3. Onglet "Accueil" → affiche l'invite "Choisissez un sommet"
4. Aller dans l'onglet "Recherche" → rechercher "Mont Blanc" → appuyer sur le résultat
5. L'app navigue vers l'accueil → ScoreSkeleton s'affiche le temps du fetch
6. La ScoreCard s'affiche avec le score, le verdict coloré et la date du jour
7. Tuer l'app et relancer → le score se charge instantanément depuis le cache (sans réseau)

**Mode MOCK_API (sans backend)** :

Dans `src/constants/devConfig.ts`, mettre `MOCK_API: true` — les scores mockés sont retournés immédiatement.

---

## Acceptance Criteria vérifiés

- [x] **AC1** — L'écran principal affiche une invite de recherche quand aucun sommet n'est sélectionné
- [x] **AC2** — Après sélection d'un sommet, le score est fetché depuis l'API et affiché dans la ScoreCard
- [x] **AC3** — Un skeleton loader animé est affiché pendant le chargement
- [x] **AC4** — Le verdict `none` (conditions bloquantes) est géré et affiché avec la couleur grise
- [x] **AC5** — Le cache AsyncStorage (TTL 2h) évite les appels réseau répétés
- [x] **AC6** — Les erreurs réseau et 503 affichent un message lisible à l'utilisateur
- [x] **AC7** — L'écran est testé unitairement (invite, skeleton, ScoreCard, erreur)
- [x] **AC8** — Tap sur un résultat de recherche → sélectionne le sommet + navigue vers l'accueil
- [x] **AC9** — Tap sur un favori → sélectionne le sommet + navigue vers l'accueil
