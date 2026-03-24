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

jest.mock('@supabase/supabase-js', () => ({
  createClient: (url: string, key: string, options: unknown) => mockCreateClient(url, key, options),
}));

describe('supabaseClient module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('crée le client avec les paramètres Expo et AsyncStorage', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { supabase } = require('@/services/supabaseClient');

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://supabase.example.com',
        'anon-key',
        {
          auth: {
            storage: AsyncStorage,
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
