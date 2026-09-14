/**
 * devConfig — configuration de développement.
 *
 * MOCK_API : si true, tous les appels réseau sont remplacés par des données
 * statiques locales (src/services/mockData/). Permet de dev mobile même si
 * le backend ou Supabase est down.
 *
 * Contrôlé par la variable d'environnement EXPO_PUBLIC_MOCK_API.
 * Dans .env : EXPO_PUBLIC_MOCK_API=true
 */
export const MOCK_API = process.env.EXPO_PUBLIC_MOCK_API === 'true';

/**
 * DEBUG : active les logs console.debug placés aux points clés (requêtes
 * réseau, cache offline, transitions AsyncState — voir CLAUDE.md "Mode debug").
 *
 * Avant EXPO_PUBLIC_DEBUG, DEBUG valait `__DEV__ && true` — donc tous les logs
 * s'affichaient sur tout build dev, en permanence, sans pouvoir les couper.
 * Nécessite maintenant __DEV__ ET la variable d'environnement EXPO_PUBLIC_DEBUG.
 *
 * Dans .env : EXPO_PUBLIC_DEBUG=true
 */
export const DEBUG = __DEV__ && process.env.EXPO_PUBLIC_DEBUG === 'true';

/**
 * DEV_TOOLS_ENABLED : affiche le bloc "DEV ·" du profil (sandbox CloudLayerViz,
 * reset du sommet sélectionné, rejouer l'onboarding).
 *
 * Avant EXPO_PUBLIC_DEV_TOOLS, ce bloc s'affichait sur tout build dev
 * (__DEV__ seul) — donc aussi pour un testeur externe qui installe un build
 * dev sans vouloir ces outils. Nécessite maintenant __DEV__ ET la variable
 * d'environnement EXPO_PUBLIC_DEV_TOOLS.
 *
 * Dans .env : EXPO_PUBLIC_DEV_TOOLS=true
 */
export const DEV_TOOLS_ENABLED = __DEV__ && process.env.EXPO_PUBLIC_DEV_TOOLS === 'true';

// Délai artificiel pour visualiser les états de chargement en dev (0 = désactivé)
export const SIMULATE_DELAY_MS = 0;
