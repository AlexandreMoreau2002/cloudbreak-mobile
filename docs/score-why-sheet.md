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

## Hard gate « nuages bas »
Si le verdict est `none` à cause de `conditions.cloud_cover_low_pct < 45` (`CLOUD_COVER_LOW_GATE_PCT`, aligné sur le hard gate backend) et que la base des nuages n'est pas déjà ≥ sommet (le facteur « Nuages vs sommet » rouge l'explique alors), `getScoreFactors` renvoie `lowCloudGate: true` (+ `cloudCoverLowPct`). La sheet affiche alors, entre les 4 lignes et le bloc prudence, un bloc d'info `score-why-gate` (clé `scoreWhy.gate`, pourcentage interpolé). Toujours 4 facteurs.

## Accesseur partagé des conditions
`src/utils/scoreConditions.ts` (`getWind`, `getHumidity`, `getInversionDelta`, `getInversionPresent`) : une seule priorité d'alias, les champs suffixés (`_kmh`, `_pct`, `_c`, ceux de l'API) d'abord. Utilisé par `scoreFactors.ts`, `ScoreDetails` et `ConditionsSection`.

## Fichiers
- `src/components/score-why/ScoreWhySheet.tsx` : contenu de la sheet (facteurs memoïsés sur `score`).
- `src/components/bottom-sheet/BottomSheet.tsx` : mécanique partagée (Modal transparent, scrim animé, translateY, grabber), aussi utilisée par `ValidationBottomSheet` ; testIDs `${testIDPrefix}-overlay` / `-sheet`.
- `src/components/score-card/ScoreCard.tsx` : prop optionnelle `onHelp`.
- `src/app/(tabs)/index.tsx` : état `whyOpen`, event `score_why_opened`.
- `Colors.factorStatus` (`src/constants/colors.ts`), clés `scoreWhy.*` (FR/EN).
