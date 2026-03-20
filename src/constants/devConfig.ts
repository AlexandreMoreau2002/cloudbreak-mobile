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

export const DEBUG = __DEV__ && true;
