# Story 1.7 — Taxonomie & Instrumentation Events PostHog (Stub) — Mobile

## Ce qui a été fait

### Fichiers créés

| Fichier | Rôle |
|---------|------|
| `src/hooks/useAppSessionTracking.ts` | Events `app_foregrounded`/`app_backgrounded` via `AppState` — monté une fois dans `_layout.tsx` |

### Fichiers modifiés (câblage `track()`)

| Fichier | Événements câblés |
|---------|-------------------|
| `src/app/_layout.tsx` | Montage de `useAppSessionTracking()` |
| `src/hooks/useOnboardingFlow.ts` (existant, story 7.1) | `onboarding_step_viewed`, `onboarding_permission_result` |
| `src/components/onboarding/welcome-slide/WelcomeSlide.tsx` | `peak_selected` (contexte onboarding) |
| `src/components/onboarding/summit-slide/SummitSlide.tsx` | `peak_selected` (contexte onboarding) |
| `src/components/onboarding/notifications-slide/NotificationsSlide.tsx` | `onboarding_permission_result` |
| `src/hooks/useAuthForm.ts` | `auth_submitted`, `auth_mode_toggled`, `signed_out` |
| `src/app/(tabs)/index.tsx` | `peak_selected`, `score_date_changed`, `score_hour_changed`, `forecast_shared`, `offline_mode_shown`, `quota_badge_viewed`, `quota_dismissed` |
| `src/components/week-strip/WeekStrip.tsx` | `onSelectDate` transmet désormais `method: 'tap' \| 'swipe'` à l'appelant (Home trace `score_date_changed` avec cette méthode) |
| `src/components/offline-banner/OfflineBanner.tsx` | `offline_mode_shown` |
| `src/components/score-card/ScoreCard.tsx` | `forecast_shared` |
| `src/hooks/usePeakSearch.ts` | `search_performed` |
| `src/app/(tabs)/search.tsx` | `peak_selected` |
| `src/app/(tabs)/favorites.tsx` | `peak_selected` |
| `src/contexts/PaywallContext.tsx` | `paywall_opened` (avec `trigger`), `paywall_dismissed` — source unique, plus besoin de tracker à chaque call site |
| `src/components/paywall/PaywallScreen.tsx` | `billing_period_selected`, `plan_selected` |
| `src/components/paywall/PaywallCTA.tsx` | `restore_purchases_clicked` |
| `src/app/(tabs)/profile.tsx` | `theme_toggled`, `language_toggled`, `delete_account_initiated` |
| `src/hooks/useLegalLinks.ts` | `legal_link_opened` |

`PaywallContext.showPaywall()` accepte désormais un `trigger` optionnel (`PaywallTrigger = 'quota' \| 'profile_banner' \| 'home_badge' \| 'unknown'`, défaut `'unknown'`) — event `paywall_opened` tracké dans le provider, pas à chaque call site.

## Comment ça fonctionne

Tous les appels `track()` ne font que logger en DEBUG (`if (DEBUG) console.debug('[analytics]', event, props)` — stub `src/services/analytics.ts` inchangé). Aucune donnée ne part vers un serveur.

```
Composant / hook UI
  → track('event_name', { props })
       → analytics.ts (stub)
            if DEBUG: console.debug('[analytics]', event, props)
            (production : no-op, aucun réseau)

PostHog réel branché derrière cette même interface dans une story dédiée
(idée notée au PRD V2 — remplacement du stub sans toucher aux appelants).
```

## Comment tester

### Automatique

```bash
cd mobile
npm run validate   # tsc + lint + jest --coverage + build:check
```

### Manuel

En dev (Metro), observer les logs `[analytics] <event> <props>` dans la console en parcourant l'app : onboarding (steps + permission), auth (submit/toggle/sign out), Home (sélection sommet, changement date/heure via tap et swipe, partage, offline, quota), recherche, favoris, paywall (ouverture avec trigger, billing, plan, restore, fermeture), profil (thème, langue, liens légaux, suppression compte).

## Acceptance Criteria vérifiés

- [x] Tous les points de câblage mobile de la spec émettent `track()` avec le nom d'event et les propriétés attendues
- [x] `app_backgrounded` porte une `session_duration_ms` cohérente (calculée depuis le dernier passage en foreground)
- [x] `search_performed` ne loggue jamais le texte brut de la recherche (`query_length` uniquement, pas `query`)
- [x] Aucun event mobile ne duplique un event backend (favoris, quota, score, compte — tous backend-only)
