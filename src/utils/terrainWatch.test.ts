import {
  canNotify,
  clearTerrainState,
  consumePendingTerrainOpen,
  getTerrainPref,
  getWatchedPeaks,
  markNotified,
  MAX_WATCHED,
  NOTIFY_COOLDOWN_MS,
  rememberWatchedPeak,
  setPendingTerrainOpen,
  setTerrainPref,
  WATCH_TTL_MS,
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

const peak = (n: number) => ({
  id: `p${n}`,
  slug: `peak-${n}`,
  name: `Peak ${n}`,
  lat: 45 + n,
  lng: 6,
  altitude: 2000,
});

beforeEach(() => mockStore.clear());

describe('watched peaks', () => {
  it('mémorise un sommet et le relit', async () => {
    await rememberWatchedPeak(peak(1), 1000);
    const peaks = await getWatchedPeaks(1000);
    expect(peaks).toEqual([
      { id: 'p1', slug: 'peak-1', name: 'Peak 1', lat: 46, lng: 6, consultedAt: 1000 },
    ]);
  });

  it('ne garde que les MAX_WATCHED plus récents, sans doublon', async () => {
    for (let i = 1; i <= MAX_WATCHED + 1; i += 1) await rememberWatchedPeak(peak(i), i);
    await rememberWatchedPeak(peak(MAX_WATCHED + 1), 99);
    const ids = (await getWatchedPeaks(100)).map((p) => p.id);
    expect(ids).toHaveLength(MAX_WATCHED);
    expect(ids[0]).toBe(`p${MAX_WATCHED + 1}`);
    expect(ids).not.toContain('p1');
  });

  it('écarte les sommets plus vieux que le TTL', async () => {
    await rememberWatchedPeak(peak(1), 0);
    expect(await getWatchedPeaks(WATCH_TTL_MS + 1)).toEqual([]);
  });

  it('retourne [] si le stockage est corrompu', async () => {
    mockStore.set('terrainWatchedPeaks', '{not json');
    expect(await getWatchedPeaks(0)).toEqual([]);
  });
});

describe('cooldown', () => {
  it('autorise la première notification puis bloque pendant le cooldown', async () => {
    expect(await canNotify('p1', 1000)).toBe(true);
    await markNotified('p1', 1000);
    expect(await canNotify('p1', 1000 + NOTIFY_COOLDOWN_MS - 1)).toBe(false);
    expect(await canNotify('p1', 1000 + NOTIFY_COOLDOWN_MS)).toBe(true);
    expect(await canNotify('p2', 1001)).toBe(true);
  });
});

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
});

describe('clearTerrainState', () => {
  it('supprime sommets, cooldowns, préférence et ouverture en attente', async () => {
    await rememberWatchedPeak(peak(1), 1000);
    await markNotified('p1', 1000);
    await setTerrainPref(false);
    await setPendingTerrainOpen('peak-1');

    await clearTerrainState();

    expect(await getWatchedPeaks(1000)).toEqual([]);
    expect(await canNotify('p1', 1001)).toBe(true);
    expect(await getTerrainPref()).toBe(true);
    expect(await consumePendingTerrainOpen('peak-1')).toBe(false);
  });
});
