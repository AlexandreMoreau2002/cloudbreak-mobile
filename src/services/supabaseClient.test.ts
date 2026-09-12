import { supabase } from '@/services/supabaseClient';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'https://project.supabase.co',
        supabaseKey: 'public-anon-key',
      },
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

describe('supabaseClient', () => {
  it('expose les primitives Supabase requises par le parcours compte', () => {
    expect(typeof supabase.auth.resend).toBe('function');
    expect(typeof supabase.auth.updateUser).toBe('function');
    expect(typeof supabase.auth.verifyOtp).toBe('function');
    expect(typeof supabase.auth.linkIdentity).toBe('function');
    expect(typeof supabase.auth.signInAnonymously).toBe('function');
    expect(typeof supabase.auth.signInWithIdToken).toBe('function');
  });
});
