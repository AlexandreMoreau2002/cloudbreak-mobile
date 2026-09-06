import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';
import { secureSessionStorage } from '@/services/secureSessionStorage';

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl as string;
const SUPABASE_KEY = Constants.expoConfig?.extra?.supabaseKey as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: secureSessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
