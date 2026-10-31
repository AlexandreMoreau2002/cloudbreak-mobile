import {
  clearTerrainState,
  consumePendingTerrainOpen,
  getTerrainPref,
  PENDING_OPEN_TTL_MS,
  setPendingTerrainOpen,
  setTerrainPref,
} from '@/utils/terrainWatch';

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  removeItem: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
}));

beforeEach(() => mockStore.clear());

describe('préférence terrain', () => {
  it('vaut true par défaut puis reflète la dernière valeur écrite', async () => {
    expect(await getTerrainPref()).toBe(true);
    await setTerrainPref(false);
    expect(await getTerrainPref()).toBe(false);
    await setTerrainPref(true);
    expect(await getTerrainPref()).toBe(true);
  });
});

describe('ouverture en attente', () => {
  it('se consomme une seule fois et seulement pour le bon slug', async () => {
    await setPendingTerrainOpen('peak-1');
    expect(await consumePendingTerrainOpen('peak-2')).toBe(false);
    expect(await consumePendingTerrainOpen('peak-1')).toBe(true);
    expect(await consumePendingTerrainOpen('peak-1')).toBe(false);
  });

  it('se consomme dans la fenêtre de validité', async () => {
    await setPendingTerrainOpen('peak-1', 1000);
    expect(await consumePendingTerrainOpen('peak-1', 1000 + PENDING_OPEN_TTL_MS)).toBe(true);
  });

  it('refuse et efface une demande expirée (ex. sommet jamais chargé)', async () => {
    await setPendingTerrainOpen('peak-1', 1000);
    expect(await consumePendingTerrainOpen('peak-1', 1000 + PENDING_OPEN_TTL_MS + 1)).toBe(false);
    expect(mockStore.has('pendingTerrainOpenSlug')).toBe(false);
  });

  it('ignore un ancien format ou un contenu corrompu', async () => {
    mockStore.set('pendingTerrainOpenSlug', '"peak-1"');
    expect(await consumePendingTerrainOpen('peak-1')).toBe(false);
  });
});

describe('clearTerrainState', () => {
  it('supprime préférence, ouverture en attente et anciennes clés de géorepérage', async () => {
    mockStore.set('terrainWatchedPeaks', '[]');
    mockStore.set('terrainNotifiedAt', '{}');
    await setTerrainPref(false);
    await setPendingTerrainOpen('peak-1');

    await clearTerrainState();

    expect(mockStore.has('terrainWatchedPeaks')).toBe(false);
    expect(mockStore.has('terrainNotifiedAt')).toBe(false);
    expect(await getTerrainPref()).toBe(true);
    expect(await consumePendingTerrainOpen('peak-1')).toBe(false);
  });
});
