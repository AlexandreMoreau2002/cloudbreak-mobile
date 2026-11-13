# Story 3.4 — ScoreCard : écran principal

_Complétée le 2026-03-23 — mise à jour le 2026-03-28_

---

## Ce qui a été fait

### Fichiers créés

| Fichier | Rôle |
|---------|------|
| `src/components/ScoreCard.tsx` | Hero card du score (score %, verdict, message contextuel, créneaux et mini visualisation nuageuse) |
| `src/components/ScoreCard.test.tsx` | Tests unitaires ScoreCard (verdicts, message, variantes compactes, heures, fallback viz) |
| `src/components/ScoreSkeleton.tsx` | Skeleton loader animé (pulsation) affiché pendant le chargement |
| `src/contexts/SelectedPeakContext.tsx` | Context React partagé : sommet sélectionné, date ISO, heure (6h par défaut) |
| `src/contexts/SelectedPeakContext.test.tsx` | Tests unitaires SelectedPeakContext (valeurs par défaut, setSelectedPeak, setSelectedDate) |
| `src/hooks/useScore.ts` | Hook asynchrone : fetch score API + cache AsyncStorage TTL 2h + gestion erreurs |
| `src/hooks/useScore.test.ts` | Tests unitaires useScore (idle, success, error, 503, cache hit, cache expiré, cache absent) |

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/app/(tabs)/index.tsx` | Home refactorisée : score courant synchronisé avec `useWeekData`, composants extraits (`PeakHeader`, `ConditionsSection`, `FavoritesGrid`) |
| `src/app/(tabs)/index.test.tsx` | Tests écran principal (invite, skeleton, scorecard, région, favoris, météo, partage, weekly) |
| `src/app/(tabs)/search.tsx` | Ajout `onPress` sur chaque item : `setSelectedPeak` + `router.push` vers home |
| `src/app/(tabs)/favorites.tsx` | Wrapper item en `TouchableOpacity` + `setSelectedPeak` + `router.push` vers home |
| `src/services/mockData/types.ts` | Ajout de `'none'` dans l'union `verdict` de `ScoreResponse` |
| `src/constants/colors.ts` | Ajout de `Colors.score.none: '#9E9E9E'` |
| `src/components/PeakHeader.tsx` | Header sommet extrait, avec altitude et région si disponible |
| `src/hooks/useWeekData.ts` | Source de données unique Home + weekly, cache 30 min et tie-break horaire |
| `src/locales/fr.ts` / `src/locales/en.ts` | Libellés score et messages UI localisés |

---

## Comment ça fonctionne

### Flux de données

```
HomeScreen
  ↓ useSelectedPeak() — lit sommet / date / heure depuis SelectedPeakContext
  ↓ useWeekData(peakId, token) — précharge 7 jours × 6 créneaux
      ↓ cache AsyncStorage 30 min par sommet/jour
      ↓ construit byDate + bestByDate
      ↓ fournit à la fois le score affiché et les données du WeekStrip
  ↓ localizeScoreResponse(rawDisplayScore)
  ↓ renderContent()
      → selectedPeak null → invite "Choisissez un sommet"
      → loading sans score courant → <ScoreSkeleton />
      → succès → <PeakHeader /> + <ScoreCard /> + <WeekStrip /> + <ConditionsSection />
      → erreur totale → carte d'erreur lisible
```

### ScoreCard

- Affiche le score en grand avec couleur selon le verdict
- Affiche le texte localisé (`label`, `context_message`) dérivé des codes backend
- Gère `none` comme un état produit distinct de `low`
- Affiche des chips d'heure quand Home passe `selectedHour` + `onSelectHour`
- Monte une version compacte de `CloudLayerViz`, avec fallback si `cloud_layer_viz` est absent

### Home actuelle

- `PeakHeader` affiche `nom · altitude · région` si `region` existe
- `WeekStrip` pilote le jour courant et resynchronise l'heure optimale
- `ConditionsSection` affiche uniquement les valeurs météo exploitables
- `FavoritesGrid` reste visible dans l'état vide et sous la prévision
- si le sommet change, Home reset immédiatement pour éviter d'afficher le score du sommet précédent

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
- `src/contexts/SelectedPeakContext.test.tsx`
- `src/hooks/useWeekData.test.ts`
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
7. Changer de jour dans `WeekStrip` → la card suit le même dataset, sans refetch séparé
8. Passer la langue fr/en depuis le profil → les libellés de Home sont rerendus dans la langue sélectionnée

**Mode MOCK_API (sans backend)** :

Dans `src/constants/devConfig.ts`, mettre `MOCK_API: true` — les scores mockés sont retournés immédiatement.

---

## Acceptance Criteria vérifiés

- [x] **AC1** — L'écran principal affiche une invite de recherche quand aucun sommet n'est sélectionné
- [x] **AC2** — Après sélection d'un sommet, le score affiché et le weekly proviennent d'une source commune (`useWeekData`)
- [x] **AC3** — Un skeleton loader animé est affiché pendant le chargement
- [x] **AC4** — Le verdict `none` (conditions bloquantes) est géré et affiché avec la couleur grise
- [x] **AC5** — Le cache AsyncStorage 30 min sur les données semaine évite les appels réseau répétés
- [x] **AC6** — Les erreurs réseau et 503 affichent un message lisible à l'utilisateur
- [x] **AC7** — L'écran est testé unitairement (invite, skeleton, ScoreCard, région, favoris, météo, weekly, partage)
- [x] **AC8** — Tap sur un résultat de recherche → sélectionne le sommet + navigue vers l'accueil
- [x] **AC9** — Tap sur un favori → sélectionne le sommet + navigue vers l'accueil
