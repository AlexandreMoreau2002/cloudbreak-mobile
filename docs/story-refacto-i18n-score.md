# Refactorisation — Traduction des codes score i18n côté mobile

_Complétée le 2026-03-28_

---

## Ce qui a été fait

| Fichier | Changement |
|---------|-----------|
| `src/services/mockData/score.ts` | `normalizeScoreResponse()` et `localizeScoreResponse()` — normalisation + retraduction lors d'un changement de langue |
| `src/services/api/score.ts` | `fetchScore()` appelle `normalizeScoreResponse()` après chaque fetch réseau |
| `src/locales/fr.ts` | Clés `score.label.*` et `score.context.*.*` |
| `src/locales/en.ts` | Mêmes clés en anglais |
| `src/contexts/LanguageContext.tsx` | Provider FR/EN + `toggleLocale()` |
| `src/app/_layout.tsx` | `LanguageProvider` monté à la racine + `Stack key={locale}` pour rerender les écrans |

---

## Pourquoi

Le backend renvoyait auparavant du texte traduit (`label`, `context_message`) en détectant `Accept-Language`.
Ce comportement a été supprimé côté backend : le back renvoie maintenant uniquement des codes stables.

Le mobile est désormais responsable de la traduction, ce qui permet :
- de changer un libellé sans déploiement backend
- d'ajouter une langue en modifiant uniquement les fichiers locales du front
- de tester la logique métier backend sans dépendre de chaînes localisées
- de rerendre immédiatement l'app quand l'utilisateur bascule fr/en

---

## Comment ca fonctionne

```
API → { label_code, context_code, context_params, ... }

fetchScore() dans src/services/api/score.ts
  → fetch réseau via apiFetch()
  → normalizeScoreResponse(apiResponse)

normalizeScoreResponse() dans src/services/mockData/score.ts
  → label = i18n.t(label_code)
  → context_message = i18n.t(context_code, context_params)
  → retourne { ...apiResponse, label, context_message }

useWeekData / useScore → consomment la réponse normalisée
LanguageProvider.toggleLocale() → met à jour i18n.locale
HomeScreen → localizeScoreResponse(rawDisplayScore) avant rendu
ScoreCard(contextMessage) → affiche le texte traduit courant
```

Les codes produits par le backend suivent la convention :
- `label_code` : `"score.label.{verdict}"` — ex: `"score.label.high"`
- `context_code` : `"score.context.{verdict}.{cle}"` — ex: `"score.context.high.inversion"`
- `context_params` : objet de substitution — ex: `{ "peak": "Mont Blanc" }`

---

## Structure des clés i18n (exemple)

Dans `src/locales/fr.ts` :

```ts
score: {
  label: {
    high: 'Très probable',
    medium: 'Possible',
    low: 'Peu probable',
    none: 'Conditions absentes',
  },
  context: {
    high: {
      inversion: 'Inversion thermique marquée sur {{peak}}.',
    },
    none: {
      clear_sky: 'Ciel trop dégagé — pas assez de nuages bas.',
      clouds_above: 'Les nuages sont au-dessus du sommet.',
    },
  },
}
```

---

## Comment tester

**Test automatique :**

```bash
cd /Users/alex/Desktop/dev/cloudbreak/mobile
npm test -- --runInBand --runTestsByPath \
  src/services/mockData/score.test.ts \
  "src/app/(tabs)/index.test.tsx" \
  src/contexts/LanguageContext.test.tsx
```

**Vérifier la normalisation manuellement :**

Dans `src/constants/devConfig.ts`, mettre `MOCK_API: false`, lancer le backend avec `make dev`, puis sélectionner un sommet dans le simulateur.

La `ScoreCard` doit afficher du texte en langue naturelle (ex: "Très probable"), pas un code brut comme `"score.label.high"`.

**Vérifier que `normalizeScoreResponse` est le seul point de traduction :**

```bash
cd /Users/alex/Desktop/dev/cloudbreak/mobile
grep -r "i18n.t.*label_code\|i18n.t.*context_code" src/
# Doit retourner uniquement src/services/mockData/score.ts
```

## Acceptance Criteria vérifiés

- [x] la traduction des scores et contextes est centralisée côté mobile
- [x] le changement de langue FR/EN rerend l'arbre d'écrans via `LanguageProvider`
- [x] le backend n'est plus requis pour embarquer des chaînes localisées
- [x] Home rerend les libellés score/context à la volée via `localizeScoreResponse()`
