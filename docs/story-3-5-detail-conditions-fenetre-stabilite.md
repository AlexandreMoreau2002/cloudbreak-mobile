# Story 3.5 — Détail conditions météo, fenêtre temporelle & stabilité

_Mise à jour le 2026-03-28_

---

## Vue d'ensemble

La story 3.5 ajoute la lecture météo détaillée autour de la `ScoreCard` de Home:

- la Home reste compacte et lisible
- le jour courant se pilote via `WeekStrip`
- le détail météo utile est affiché inline dans `ConditionsSection`
- `CloudLayerViz` gère la lecture couche nuageuse vs sommet avec 3 chemins de rendu
- le score courant et le weekly sont synchronisés via une source de données unique

Le flux actuel privilégie l'usage direct sur Home, avec des composants réutilisables pour le détail.

---

## Architecture actuelle

| Bloc | Rôle |
|------|------|
| [`src/app/(tabs)/index.tsx`](/Users/alex/Desktop/dev/cloudbreak/mobile/src/app/(tabs)/index.tsx) | Orchestre Home: sommet sélectionné, score courant, `WeekStrip`, favoris et affichage du résumé |
| [`src/components/ScoreCard.tsx`](/Users/alex/Desktop/dev/cloudbreak/mobile/src/components/ScoreCard.tsx) | Hero card du score: verdict, score %, sommet, altitude, heure, message contextuel et mini-viz compacte |
| [`src/components/WeekStrip.tsx`](/Users/alex/Desktop/dev/cloudbreak/mobile/src/components/WeekStrip.tsx) | Sélecteur horizontal des jours, avec tap/swipe et scores journaliers optionnels |
| [`src/hooks/useWeekData.ts`](/Users/alex/Desktop/dev/cloudbreak/mobile/src/hooks/useWeekData.ts) | Source de données unique 7 jours × 6 créneaux avec cache 30 min, `byDate` et `bestByDate` |
| [`src/components/ConditionsSection.tsx`](/Users/alex/Desktop/dev/cloudbreak/mobile/src/components/ConditionsSection.tsx) | Section inline des conditions utiles sur Home |
| [`src/components/ScoreDetails.tsx`](/Users/alex/Desktop/dev/cloudbreak/mobile/src/components/ScoreDetails.tsx) | Panneau détail réutilisable: fenêtre optimale, lever du soleil, badges météo, stabilité, viz détaillée |
| [`src/components/ConditionBadge.tsx`](/Users/alex/Desktop/dev/cloudbreak/mobile/src/components/ConditionBadge.tsx) | Briques de lecture pour base nuageuse, humidité, vent, inversion |
| [`src/components/CloudLayerViz.tsx`](/Users/alex/Desktop/dev/cloudbreak/mobile/src/components/CloudLayerViz.tsx) | Orchestrateur du graphe, avec rendu `compact`, `isSunny` et détail |
| [`src/components/cloud-layer-viz/*`](/Users/alex/Desktop/dev/cloudbreak/mobile/src/components/cloud-layer-viz) | Implémentation interne: géométrie, styles, palette, scène et sous-composants |

---

## Logique de rendu

- `compact` est utilisé dans la `ScoreCard` de Home.
- `isSunny` affiche un chemin dédié quand la lecture produit indique un ciel dégagé.
- le rendu par défaut affiche le graphe détaillé avec résumé, axes et marge verticale.
- `tone=auto` suit `ThemeContext` pour garder la cohérence light/dark.
- la `ScoreCard` garde un fallback si `cloud_layer_viz` n'est pas fourni par le backend.

---

## Données et flux

```text
HomeScreen
  ├─ useSelectedPeak() → sommet / date / heure partagés
  ├─ useWeekData(peakId, token) → byDate + bestByDate + cache AsyncStorage 30 min
  ├─ localizeScoreResponse() → texte localisé à partir des codes backend
  └─ render
       ├─ ScoreCard (compact + message contextuel + heures)
       ├─ WeekStrip (tap / swipe)
       ├─ sections météo inline
       └─ favoris
```

`ScoreDetails` reste un panneau réutilisable pour le détail 3.5, mais la Home actuelle affiche surtout le résumé compact et les informations utiles directement dans la page.

---

## Règle produit à refléter dans l'UI

Le backend applique une règle bloquante avant de calculer un score mer de nuage :

- si `cloud_cover_low < 45%`, il considère qu'il n'y a pas assez de nuages bas pour former une couche exploitable
- dans ce cas, il retourne immédiatement `verdict = "none"` et `score = 0`
- le bon framing UX n'est donc pas "petite chance", mais "pas de scénario mer de nuage aujourd'hui"

### Rationale UX

- éviter un faux signal du type `low` quand le ciel est simplement trop dégagé
- faire comprendre qu'on manque de **couche** avant même de discuter humidité, vent ou stabilité
- garder une lecture honnête en été et en intersaison : on peut avoir un beau temps utile pour randonner, mais pas de mer de nuage

### Impact utilisateur

- quand la Home affiche `Pas de mer de nuage`, cela peut venir d'un vrai blocage "pas assez de nuages bas", pas seulement d'un mauvais cocktail météo
- dans cet état, le message contextuel est prioritaire sur la lecture des badges détaillés
- le wording doit expliquer l'absence de couche basse, pas suggérer qu'une légère amélioration pourrait suffire dans la journée

### Implication pour les composants

- `ScoreCard` doit traiter `none` comme un état produit distinct de `low`
- les messages i18n liés à `score.context.none.low_cloud_cover` doivent rester centrés sur l'idée de couche insuffisante ou trop fragmentée
- les écrans détaillés ne doivent pas encourager une sur-interprétation du score quand le backend a court-circuité le calcul
- `WeekStrip` ne doit pas afficher un meilleur score venant d'une autre source que celle utilisée pour la card

---

## QA utile

- vérifier qu'un sommet sélectionné affiche bien la `ScoreCard`
- vérifier que `WeekStrip` change la date par tap et par swipe
- vérifier les 3 états du graphe: `compact`, `isSunny`, détail
- vérifier que le header du sommet affiche la région quand `peak_region` est présent
- vérifier la stabilité du layout Home sur petits écrans
- vérifier que les données météo 3.5 restent lisibles en light et dark
- vérifier que `ScoreDetails` rend bien la fenêtre optimale, le lever du soleil, les badges météo et la stabilité quand il est monté
- vérifier les tests dédiés `cloud-layer-viz/*` et les mocks `score/peaks/types/user`

---

## Validation

- `cd mobile && npm run validate`
- tests ciblés utiles:
  - `src/components/ScoreCard.test.tsx`
  - `src/components/ScoreDetails.test.tsx`
  - `src/components/WeekStrip.test.tsx`
  - `src/components/cloud-layer-viz/ChartScene.test.tsx`
  - `src/components/cloud-layer-viz/CompactCloudLayerViz.test.tsx`
  - `src/components/cloud-layer-viz/DetailedCloudLayerViz.test.tsx`
  - `src/components/cloud-layer-viz/geometry.test.ts`
  - `src/components/cloud-layer-viz/palette.test.ts`
  - `src/components/cloud-layer-viz/constants.test.ts`
  - `src/hooks/useWeekData.test.ts`
  - `src/app/(tabs)/index.test.tsx`

---

## Acceptance Criteria vérifiés

- [x] la Home expose la fenêtre optimale, la stabilité et les conditions utiles via les composants 3.5
- [x] `CloudLayerViz` supporte les variantes compacte, détaillée et sunny
- [x] le score courant et le weekly partagent la même source (`useWeekData`)
- [x] le verdict `none` est présenté comme absence de scénario, pas comme simple probabilité faible
- [x] la couverture de tests inclut les primitives `cloud-layer-viz` et les états clés de Home
