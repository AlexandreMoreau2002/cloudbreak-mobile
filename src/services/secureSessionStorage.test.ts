import { secureSessionStorage } from '@/services/secureSessionStorage';

const mockKeychain = new Map<string, string>();
const mockAsyncStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => (mockKeychain.has(key) ? mockKeychain.get(key) : null)),
  setItemAsync: jest.fn(async (key: string, value: string) => { mockKeychain.set(key, String(value)); }),
  deleteItemAsync: jest.fn(async (key: string) => { mockKeychain.delete(key); }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => (mockAsyncStore.has(key) ? mockAsyncStore.get(key) : null)),
    removeItem: jest.fn(async (key: string) => { mockAsyncStore.delete(key); }),
  },
}));

jest.mock('@/constants/devConfig', () => ({ DEBUG: false }));

const KEY = 'sb-project-auth-token';

beforeEach(() => {
  mockKeychain.clear();
  mockAsyncStore.clear();
  jest.clearAllMocks();
});

describe('secureSessionStorage', () => {
  it('round-trip une valeur plus grande que la limite de 2048 octets', async () => {
    const big = 'x'.repeat(7000);
    await secureSessionStorage.setItem(KEY, big);

    // fragmentée dans le Keychain, jamais en un seul bloc
    expect(mockKeychain.get(KEY)).toBe('5');
    expect(await secureSessionStorage.getItem(KEY)).toBe(big);
  });

  it('réécrit sans laisser de fragments orphelins', async () => {
    await secureSessionStorage.setItem(KEY, 'y'.repeat(5000)); // 4 fragments
    await secureSessionStorage.setItem(KEY, 'z'.repeat(100)); // 1 fragment

    expect(await secureSessionStorage.getItem(KEY)).toBe('z'.repeat(100));
    expect(mockKeychain.has(`${KEY}__chunk__1`)).toBe(false);
  });

  it('supprime la valeur et purge AsyncStorage', async () => {
    await secureSessionStorage.setItem(KEY, 'abc');
    mockAsyncStore.set(KEY, 'legacy');

    await secureSessionStorage.removeItem(KEY);

    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
    expect(mockAsyncStore.has(KEY)).toBe(false);
  });

  it('migre une session héritée d\'AsyncStorage vers le Keychain puis purge le token en clair', async () => {
    mockAsyncStore.set(KEY, 'legacy-session-token');

    const migrated = await secureSessionStorage.getItem(KEY);

    expect(migrated).toBe('legacy-session-token');
    expect(mockAsyncStore.has(KEY)).toBe(false);
    expect(await secureSessionStorage.getItem(KEY)).toBe('legacy-session-token');
  });

  it('retourne null quand rien n\'est stocké', async () => {
    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });

  it('retourne null si un fragment est manquant (stockage corrompu)', async () => {
    await secureSessionStorage.setItem(KEY, 'a'.repeat(4000)); // 3 fragments
    mockKeychain.delete(`${KEY}__chunk__1`);

    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });

  it('ignore un compteur de fragments invalide', async () => {
    mockKeychain.set(KEY, 'not-a-number');
    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });
});
