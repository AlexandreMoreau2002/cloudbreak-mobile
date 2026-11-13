# Story 4.2 — Paywall Mobile & Conversion Freemium

## Ce qui a été fait

| Fichier | Rôle |
|---------|------|
| `src/components/paywall/types.ts` | Types partagés : `BillingPeriod`, `PaywallPlan`, `PaywallScreenProps`, props de chaque sous-composant |
| `src/components/paywall/PaywallScreen.tsx` | Modal plein écran, animation slide-up + fade overlay, orchestrateur des sous-composants |
| `src/components/paywall/PaywallHeader.tsx` | Badge essai gratuit + titre + sous-titre |
| `src/components/paywall/PaywallBillingToggle.tsx` | Toggle Mensuel / Annuel avec badge économies |
| `src/components/paywall/PaywallCTA.tsx` | Bouton CTA principal + bouton restaurer achats |
| `src/components/paywall/PaywallFooter.tsx` | Lien "Continuer sans abonnement" (dismiss) |
| `src/components/paywall/index.ts` | Barrel export |
| `src/components/paywall/PaywallScreen.test.tsx` | Tests unitaires PaywallScreen (visibilité, toggle, CTA, dismiss) |
| `src/app/(tabs)/index.tsx` | Intégration : détection `weekError === 'QUOTA_EXCEEDED'` → `showPaywall = true` → `<PaywallScreen>` |
| `src/app/(tabs)/index.test.tsx` | Test intégration : erreur QUOTA_EXCEEDED affiche le paywall |

## Comment ça fonctionne

1. **Trigger** : `useWeekData` remonte une erreur `'QUOTA_EXCEEDED'` (HTTP 429 backend) quand le quota freemium est atteint.
2. **Détection** : l'écran principal (`index.tsx`) surveille `weekError` et passe `showPaywall = true` quand la valeur est `'QUOTA_EXCEEDED'`.
3. **Affichage** : `PaywallScreen` est rendu en `Modal` transparent avec une animation double :
   - Fond assombri en fade (`Animated.timing` opacity 0→1, 250 ms)
   - Sheet qui monte depuis le bas (`Animated.timing` translateY 600→0, 350 ms, `Easing.out(Easing.cubic)`)
4. **Architecture DDD** : la sheet est composée de 4 sous-composants indépendants (`PaywallHeader`, `PaywallBillingToggle`, `PaywallCTA`, `PaywallFooter`) — chacun reçoit uniquement les couleurs et callbacks dont il a besoin.
5. **Toggle mensuel/annuel** : état local `billingPeriod` dans `PaywallScreen`, passé à `PaywallBillingToggle` et `PaywallCTA`.
6. **Dismiss** : pression sur l'overlay (zone hors sheet) ou sur le bouton footer appelle `onDismiss`.

## Comment tester

```bash
# 1. Lancer Metro (build natif déjà installé)
cd mobile && npm start

# 2. Dans devConfig.ts, activer MOCK_API: true
# 3. Modifier mockData pour retourner une erreur QUOTA_EXCEEDED
#    OU appeler l'API réelle avec un compte ayant épuisé son quota

# 4. Ouvrir l'app sur le simulateur iOS
# 5. Naviguer vers un sommet → l'écran principal affiche le paywall

# 6. Vérifier :
#    - La sheet monte depuis le bas avec animation fluide
#    - Le fond est assombri
#    - Le badge "Essai gratuit" est visible
#    - Le toggle Mensuel/Annuel est interactif
#    - Le bouton CTA appelle onSelectPlan avec la période choisie
#    - Taper sur l'overlay ou "Continuer sans abonnement" ferme le paywall
```

```bash
# Tests automatiques
npm test -- --testPathPattern="PaywallScreen|index"
```

## Acceptance Criteria vérifiés

- [x] AC1 — Erreur `QUOTA_EXCEEDED` (429) dans `useWeekData` → `PaywallScreen` s'affiche sur l'écran principal
- [x] AC2 — `PaywallScreen` affiche : badge essai gratuit, titre, bénéfices, toggle mensuel/annuel avec prix, bouton CTA, lien dismiss
- [ ] AC3 — Compteur discret de consultations restantes visible avant le déclenchement du paywall (non implémenté — à planifier en story 4.3 ou 4.x)

> **Note AC3** : le compteur freemium (ex: "2 consultations restantes aujourd'hui") n'est pas affiché dans cette story. Le backend retourne directement 429 quand le quota est atteint, sans exposer le quota restant dans les réponses normales. Nécessite un endpoint dédié ou un header `X-Quota-Remaining` côté backend.
