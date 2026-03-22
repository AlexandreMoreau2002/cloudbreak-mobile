# Cloudbreak Mobile — Audit produit

_Dernière mise à jour : 2026-03-22_

---

## Ce qui est fonctionnel aujourd'hui

| Fonctionnalité | État |
|----------------|------|
| Setup Expo SDK 55 / React Native 0.83 | ✅ |
| Design system (tokens couleurs, typo, spacing) | ✅ |
| Navigation Expo Router (tabs + auth guard) | ✅ |
| Auth Supabase (inscription, connexion, logout) | ✅ |
| ThemeContext (light/dark) | ✅ |
| AuthContext + AuthGuard | ✅ |
| i18n (fr) | ✅ |
| CI GitHub Actions (lint + tsc + jest + build check) | ✅ |
| Recherche de sommets autocomplete (story 3.3) | ✅ |
| Favoris — ajout, suppression, liste (story 3.3) | ✅ |
| Toggle favori depuis la recherche (story 3.3) | ✅ |
| Tri favoris en premier dans la recherche (story 3.3) | ✅ |

## Ce qui n'existe pas encore

- Écran principal ScoreCard (story 3.4)
- Hook useScore + appel backend score
- Navigation sommet → ScoreCard (story 3.4)
- Cache offline AsyncStorage
- Paywall / freemium (epic 4)
- Notifications push (epic 5)
- Validation terrain (epic 6)
- Onboarding (epic 7)

---

## Prochaines étapes

1. **Story 3.4** — Écran principal ScoreCard + affichage verdict
2. **Story 3.5** — Détail conditions météo + fenêtre temporelle
