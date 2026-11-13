describe('supabaseClient — garde de configuration', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('lève une erreur explicite si supabaseUrl est absent', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { expoConfig: { extra: { supabaseKey: 'public-anon-key' } } },
    }));
    jest.doMock('@react-native-async-storage/async-storage', () => ({
      __esModule: true,
      default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
    }));

    expect(() => require('@/services/supabaseClient')).toThrow(/Configuration Supabase manquante/);
  });

  it('lève une erreur explicite si supabaseKey est absent', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { expoConfig: { extra: { supabaseUrl: 'https://project.supabase.co' } } },
    }));
    jest.doMock('@react-native-async-storage/async-storage', () => ({
      __esModule: true,
      default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
    }));

    expect(() => require('@/services/supabaseClient')).toThrow(/Configuration Supabase manquante/);
  });

  it('ne lève rien si supabaseUrl et supabaseKey sont présents', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {
          extra: { supabaseUrl: 'https://project.supabase.co', supabaseKey: 'public-anon-key' },
        },
      },
    }));
    jest.doMock('@react-native-async-storage/async-storage', () => ({
      __esModule: true,
      default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
    }));

    expect(() => require('@/services/supabaseClient')).not.toThrow();
  });
});
