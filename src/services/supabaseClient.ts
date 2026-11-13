import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';
import { secureSessionStorage } from '@/services/secureSessionStorage';

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl as string | undefined;
const SUPABASE_KEY = Constants.expoConfig?.extra?.supabaseKey as string | undefined;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    'Configuration Supabase manquante (extra.supabaseUrl / extra.supabaseKey) — '
    + 'vérifier le profil de build EAS.',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: secureSessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
