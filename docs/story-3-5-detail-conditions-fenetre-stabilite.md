# Story 3.5 — Détail conditions météo, fenêtre temporelle & stabilité

_Mise à jour le 2026-03-25_

---

## Vue d'ensemble

La story 3.5 ajoute la lecture météo détaillée autour de la `ScoreCard` de Home:

- la Home reste compacte et lisible
- le jour courant se pilote via `WeekStrip`
- le détail météo est exposé dans `ScoreDetails`
- `CloudLayerViz` gère la lecture couche nuageuse vs sommet avec 3 chemins de rendu

Le flux actuel privilégie l'usage direct sur Home, avec des composants réutilisables pour le détail.

---

## Architecture actuelle

| Bloc | Rôle |
|------|------|
| [`src/app/(tabs)/index.tsx`](/Users/alex/Desktop/dev/cloudbreak/mobile/src/app/(tabs)/index.tsx) | Orchestre Home: sommet sélectionné, score courant, `WeekStrip`, favoris, partage et affichage du résumé |
| [`src/components/ScoreCard.tsx`](/Users/alex/Desktop/dev/cloudbreak/mobile/src/components/ScoreCard.tsx) | Hero card du score: verdict, score %, sommet, altitude, heure, message contextuel et mini-viz compacte |
| [`src/components/WeekStrip.tsx`](/Users/alex/Desktop/dev/cloudbreak/mobile/src/components/WeekStrip.tsx) | Sélecteur horizontal des jours, avec tap/swipe et scores journaliers optionnels |
| [`src/hooks/useWeekScores.ts`](/Users/alex/Desktop/dev/cloudbreak/mobile/src/hooks/useWeekScores.ts) | Charge les scores des 7 prochains jours pour l'heure sélectionnée |
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
  ├─ useScore(peakId, date, hour, token) → score courant + cache AsyncStorage 2h
  ├─ useWeekScores(peakId, hour, token) → scores des 7 prochains jours
  └─ render
       ├─ ScoreCard (compact + message contextuel + heures)
       ├─ WeekStrip (tap / swipe)
       ├─ sections météo inline
       └─ favoris
```

`ScoreDetails` reste un panneau réutilisable pour le détail 3.5, mais la Home actuelle affiche surtout le résumé compact et les informations utiles directement dans la page.

---

## QA utile

- vérifier qu'un sommet sélectionné affiche bien la `ScoreCard`
- vérifier que `WeekStrip` change la date par tap et par swipe
- vérifier les 3 états du graphe: `compact`, `isSunny`, détail
- vérifier la stabilité du layout Home sur petits écrans
- vérifier que les données météo 3.5 restent lisibles en light et dark
- vérifier que `ScoreDetails` rend bien la fenêtre optimale, le lever du soleil, les badges météo et la stabilité quand il est monté

---

## Validation

- `cd mobile && npm run validate`
- tests ciblés utiles:
  - `src/components/ScoreCard.test.tsx`
  - `src/components/ScoreDetails.test.tsx`
  - `src/components/WeekStrip.test.tsx`
  - `src/components/CloudLayerViz.test.tsx`
  - `src/hooks/useWeekScores.test.ts`

---

## Notes

- le contrat mobile reste tolérant si certains champs 3.5 ne sont pas encore fournis par le backend
- la suite logique produit après la 3.5 est la story `3.6`
