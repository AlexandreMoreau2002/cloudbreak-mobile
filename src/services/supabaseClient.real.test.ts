const mockCreateClient = jest.fn((_url: string, _key: string, _options: unknown) => ({ auth: { mocked: true } }));

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      supabaseUrl: 'https://supabase.example.com',
      supabaseKey: 'anon-key',
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({ mockedStorage: true }));

jest.mock('@/services/secureSessionStorage', () => ({
  secureSessionStorage: { __keychain: true },
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (url: string, key: string, options: unknown) => mockCreateClient(url, key, options),
}));

describe('supabaseClient module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('crée le client avec les paramètres Expo et le stockage Keychain', () => {
    jest.isolateModules(() => {
      const { secureSessionStorage } = require('@/services/secureSessionStorage');
      const { supabase } = require('@/services/supabaseClient');

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://supabase.example.com',
        'anon-key',
        {
          auth: {
            storage: secureSessionStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
          },
        },
      );
      expect(supabase).toEqual({ auth: { mocked: true } });
    });
  });
});
