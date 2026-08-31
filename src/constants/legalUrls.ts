// URLs pages légales — service cloudbreak-ops (Next.js).
// EXPO_PUBLIC_LEGAL_BASE_URL pointe vers localhost en dev (npm run dev -- --port 3100
// dans ops/) et vers https://ops.cloudbreak-app.com en prod (domaine réservé le 2026-08-09,
// pas encore déployé en prod), voir ops/docs/story-1-legal-pages.md
const LEGAL_BASE_URL = process.env.EXPO_PUBLIC_LEGAL_BASE_URL ?? 'https://ops.cloudbreak-app.com';

// EXPO_PUBLIC_SUPPORT_EMAIL — adresse pas encore définitive au moment de l'écriture,
// le fallback support@cloudbreak.app est un placeholder à remplacer avant release.
const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@cloudbreak.app';

export const LEGAL_URLS = {
  privacy: `${LEGAL_BASE_URL}/fr/privacy`,
  cgu: `${LEGAL_BASE_URL}/fr/cgu`,
  support: `mailto:${SUPPORT_EMAIL}`,
} as const;
