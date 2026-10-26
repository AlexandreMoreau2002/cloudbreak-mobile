# Sheet « Pourquoi ce score ? »

Bouton « ? » à droite du badge de verdict de la `ScoreCard` (Home) → bottom sheet `ScoreWhySheet` qui explique le score via 4 facteurs.

## Facteurs et seuils (source unique : `src/constants/scoreFactors.ts`)

| Facteur | Donnée | Vert | Orange | Rouge |
|---|---|---|---|---|
| Inversion | T850 − T925 (°C) | ≥ 3 | > 0 | ≤ 0 |
| Nuages vs sommet | altitude sommet − base (m) | ≥ 150 | > 0 | ≤ 0 |
| Vent | km/h | < 10 | < 20 | ≥ 20 |
| Humidité | % | ≥ 85 | ≥ 70 | < 70 |

Ce sont des seuils d'affichage, alignés sur les caps et le verdict `high` du backend (`app/domain/score_components.py`), pas des bornes de calcul. Donnée absente → « — » et point gris.

## Fichiers
- `src/components/score-why/ScoreWhySheet.tsx` : sheet (Modal + Animated, même pattern que `ValidationBottomSheet`).
- `src/components/score-card/ScoreCard.tsx` : prop optionnelle `onHelp`.
- `src/app/(tabs)/index.tsx` : état `whyOpen`, event `score_why_opened`.
- `Colors.factorStatus` (`src/constants/colors.ts`), clés `scoreWhy.*` (FR/EN).
