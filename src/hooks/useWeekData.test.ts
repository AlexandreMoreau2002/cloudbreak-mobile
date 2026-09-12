import React from 'react';
import NetInfo from '@react-native-community/netinfo';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchScore } from '@/services/api/score';
import { useWeekData } from '@/hooks/useWeekData';

const mockReact = React;

jest.mock('@/services/api/score', () => ({ fetchScore: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/constants/devConfig', () => ({ DEBUG: false, MOCK_API: false }));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn() },
}));

const mockFetchScore = fetchScore as jest.MockedFunction<typeof fetchScore>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNetInfoFetch = NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>;
let consoleDebugSpy: jest.SpyInstance;
type WeekDataHookProps = { peakId: string; token: string };

const MOCK_SCORE = {
  score: 72,
  verdict: 'high' as const,
  label: 'Élevée',
  label_code: 'score.label.high',
  context_code: 'score.context.high.classic',
  context_message: 'Conditions favorables',
  cloud_base: 900,
  peak_name: 'Test Peak',
  peak_altitude: 1800,
  peak_region: null,
  peak_slug: 'test-peak',
  optimal_window_start: null,
  optimal_window_end: null,
  sunrise: null,
  stability_hours: null,
  conditions: {
    cloud_base_score: 0.9,
    humidity_score: 0.8,
    wind_score: 0.7,
    inversion_score: 0.6,
  },
  cloud_layer_viz: null,
};

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-03-24T08:00:00Z'));
  consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
  mockFetchScore.mockResolvedValue(MOCK_SCORE);
  mockAsyncStorage.getItem.mockResolvedValue(null);
  mockAsyncStorage.setItem.mockResolvedValue(undefined);
  mockNetInfoFetch.mockResolvedValue({ isConnected: true } as never);
});

afterEach(() => {
  jest.useRealTimers();
  consoleDebugSpy.mockRestore();
  jest.clearAllMocks();
});

function runIsolatedWeekDataTestWithDebug(
  mockApi: boolean,
  run: (deps: {
    useWeekData: typeof useWeekData;
    renderHook: typeof renderHook;
    waitFor: typeof waitFor;
    mockFetchScore: jest.MockedFunction<typeof fetchScore>;
    mockAsyncStorage: jest.Mocked<typeof AsyncStorage>;
  }) => Promise<void> | void,
): Promise<void> {
  jest.resetModules();
  jest.doMock('react', () => mockReact);
  jest.doMock('@/constants/devConfig', () => ({
    DEBUG: true,
    MOCK_API: mockApi,
  }));
  jest.doMock('@/services/api/score', () => ({ fetchScore: mockFetchScore }));
  jest.doMock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
  jest.doMock('@react-native-community/netinfo', () => ({
    __esModule: true,
    default: { fetch: mockNetInfoFetch },
  }));

  const { useWeekData: isolatedUseWeekData } =
    jest.requireActual('@/hooks/useWeekData') as typeof import('@/hooks/useWeekData');

  return Promise.resolve(
    run({
      useWeekData: isolatedUseWeekData,
      renderHook,
      waitFor,
      mockFetchScore,
      mockAsyncStorage,
    }),
  );
}

describe('useWeekData', () => {
  it('retourne_null_si_peakId_absent', async () => {
    const { result } = renderHook(() => useWeekData(null, 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('retourne_null_si_token_absent', async () => {
    const { result } = renderHook(() => useWeekData('peak-1', null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
  });

  it('charge les donnees et construit byDate et bestByDate', async () => {
    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).not.toBeNull();
    // 7 jours attendus
    expect(Object.keys(result.current.data!.byDate)).toHaveLength(7);
    expect(Object.keys(result.current.data!.bestByDate)).toHaveLength(7);
    // fetchScore appelé 63 fois (7 jours × 9 créneaux)
    expect(mockFetchScore).toHaveBeenCalledTimes(63);
  });

  it('bestByDate contient le score et le verdict corrects', async () => {
    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const today = '2026-03-24';
    expect(result.current.data!.bestByDate[today]).toMatchObject({
      score: 72,
      verdict: 'high',
    });
  });

  it('lit le cache valide et applique le tie-breaker du cache hit', async () => {
    const today = '2026-03-24';
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        byDate: {
          [today]: {
            '08': { ...MOCK_SCORE, score: 72 },
            '06': { ...MOCK_SCORE, score: 72 },
          },
        },
        cachedAt: Date.now(),
      }),
    );

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.bestByDate[today].hour).toBe(6);
    expect(mockFetchScore).not.toHaveBeenCalled();
    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('expose fromCache et cachedAt quand le cache est valide', async () => {
    const today = '2026-03-24';
    const cachedAt = Date.now() - 60 * 1000;
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        byDate: { [today]: { 6: MOCK_SCORE } },
        cachedAt,
      }),
    );

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.fromCache).toBe(true);
    expect(result.current.cachedAt).toBe(cachedAt);
  });

  it('expose fromCache=false et cachedAt=null après un fetch réseau frais', async () => {
    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.fromCache).toBe(false);
    expect(result.current.cachedAt).toBeNull();
  });

  it('ignore un cache invalide puis refetch et reecrit le cache', async () => {
    const today = '2026-03-24';
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        byDate: {
          [today]: {},
        },
        cachedAt: Date.now(),
      }),
    );

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).not.toBeNull();
    expect(mockFetchScore).toHaveBeenCalledTimes(63);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(1);
    expect(mockAsyncStorage.setItem.mock.calls[0][0]).toContain('cache:weekdata:v4:peak-1:2026-03-24');
  });

  it('ignore une erreur de lecture du cache et poursuit le fetch', async () => {
    mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('read failed'));

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).not.toBeNull();
    expect(mockFetchScore).toHaveBeenCalledTimes(63);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('garde les donnees actuelles pendant un refresh du meme sommet', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        byDate: {
          '2026-03-24': {
            6: MOCK_SCORE,
          },
        },
        cachedAt: Date.now(),
      }),
    );

    const { result, rerender } = renderHook(
      (({ peakId, token }: WeekDataHookProps) => useWeekData(peakId, token)) as (
        props: unknown,
      ) => ReturnType<typeof useWeekData>,
      {
        initialProps: { peakId: 'peak-1', token: 'token-1' },
      },
    );
    const typedResult = result as { current: ReturnType<typeof useWeekData> };
    const typedRerender = rerender as (props: WeekDataHookProps) => void;

    await waitFor(() => expect(typedResult.current.loading).toBe(false));
    expect(typedResult.current.data).not.toBeNull();

    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
    mockFetchScore.mockImplementationOnce(() => new Promise<never>(() => undefined));
    typedRerender({ peakId: 'peak-1', token: 'token-2' });
    expect(typedResult.current.data).not.toBeNull();
    expect(typedResult.current.loading).toBe(true);
  });

  it('refetch si le cache est stale même quand la journée existe', async () => {
    const today = '2026-03-24';
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        byDate: {
          [today]: {
            6: MOCK_SCORE,
          },
        },
        cachedAt: Date.now() - (3 * 60 * 60 * 1000 + 60 * 1000),
      }),
    );

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetchScore).toHaveBeenCalledTimes(63);
    expect(result.current.data).not.toBeNull();
  });

  it('refetch si la date du jour est absente du cache', async () => {
    const today = '2026-03-24';
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        byDate: {
          '2026-03-23': {
            6: MOCK_SCORE,
          },
        },
        cachedAt: Date.now(),
      }),
    );

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetchScore).toHaveBeenCalledTimes(63);
    expect(result.current.data).not.toBeNull();
    expect(Object.keys(result.current.data!.byDate)).toContain(today);
  });

  it('tie-break : 06h gagne sur 08h si meme score', async () => {
    // Tous les créneaux renvoient le même score → 06h doit gagner
    mockFetchScore.mockResolvedValue(MOCK_SCORE);

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const today = '2026-03-24';
    expect(result.current.data!.bestByDate[today].hour).toBe(6);
  });

  it('tie-break : 08h gagne sur 16h si meme score', async () => {
    // Hack: 06h retourne 0, les autres retournent le même score → 08h doit gagner sur 16h
    mockFetchScore.mockImplementation((_token, _peak, _date, hour) => {
      if (hour === 6) return Promise.resolve({ ...MOCK_SCORE, score: 0, verdict: 'none' as const });
      return Promise.resolve(MOCK_SCORE);
    });

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const today = '2026-03-24';
    expect(result.current.data!.bestByDate[today].hour).toBe(8);
  });

  it('retourne_erreur_si_tous_les_fetches_echouent', async () => {
    mockFetchScore.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Erreur de chargement');
  });

  it('detecte une erreur 503 et adapte le message', async () => {
    mockFetchScore.mockRejectedValue(new Error('503 Service Unavailable'));

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Service momentanément indisponible');
  });

  it('byDate contient les donnees pour chaque heure fetchee', async () => {
    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const today = '2026-03-24';
    const hours = Object.keys(result.current.data!.byDate[today]).map(Number);
    expect(hours.sort((a, b) => a - b)).toEqual([6, 8, 10, 12, 14, 16, 18, 20, 22]);
  });

  it('ignore les erreurs partielles de fetch et conserve les donnees restantes', async () => {
    mockFetchScore.mockImplementation(async (_token, _peakId, date, hour) => {
      if (date === '2026-03-24' && hour === 6) {
        throw new Error('503 Service Unavailable');
      }
      if (date === '2026-03-24' && hour === 8) {
        throw new Error('service unavailable');
      }
      return MOCK_SCORE;
    });

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).not.toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.data!.byDate['2026-03-24']).not.toHaveProperty('6');
    expect(result.current.data!.byDate['2026-03-24']).not.toHaveProperty('8');
  });

  it('ignore une erreur de cache write sans casser le résultat', async () => {
    mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('write failed'));

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).not.toBeNull();
    expect(mockFetchScore).toHaveBeenCalledTimes(63);
  });

  it('utilise le fallback de tie-break pour des heures inconnues et ignore une date vide', async () => {
    const today = '2026-03-24';
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        byDate: {
          [today]: {
            18: { ...MOCK_SCORE, score: 72 },
            20: { ...MOCK_SCORE, score: 72 },
          },
          '2026-03-25': {},
        },
        cachedAt: Date.now(),
      }),
    );

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.bestByDate[today].hour).toBe(18);
    expect(result.current.data!.bestByDate['2026-03-25']).toBeUndefined();
  });

  it('ignore une rejection non Error pendant le fetch', async () => {
    mockFetchScore.mockImplementation(async (_token, _peakId, _date, hour) => {
      if (hour === 6) {
        throw 'boom';
      }
      return MOCK_SCORE;
    });

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('couvre les branches debug quand le cache est valide', async () => {
    await runIsolatedWeekDataTestWithDebug(false, async ({ useWeekData: isolatedUseWeekData, renderHook: isolatedRenderHook, waitFor: isolatedWaitFor, mockAsyncStorage: isolatedAsyncStorage }) => {
      isolatedAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({
          byDate: {
            '2026-03-24': {
              6: MOCK_SCORE,
            },
          },
          cachedAt: Date.now(),
        }),
      );

      const { result } = isolatedRenderHook(() => isolatedUseWeekData('peak-1', 'token'));
      await isolatedWaitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data).not.toBeNull();
    });
  });

  it('couvre la branche debug quand le cache est invalide', async () => {
    await runIsolatedWeekDataTestWithDebug(false, async ({ useWeekData: isolatedUseWeekData, renderHook: isolatedRenderHook, waitFor: isolatedWaitFor, mockAsyncStorage: isolatedAsyncStorage }) => {
      isolatedAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({
          byDate: {
            '2026-03-24': {},
          },
          cachedAt: Date.now(),
        }),
      );

      const { result } = isolatedRenderHook(() => isolatedUseWeekData('peak-1', 'token'));
      await isolatedWaitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data).not.toBeNull();
    });
  });

  it('couvre les branches debug et MOCK_API quand le cache est ignoré', async () => {
    await runIsolatedWeekDataTestWithDebug(true, async ({ useWeekData: isolatedUseWeekData, renderHook: isolatedRenderHook, waitFor: isolatedWaitFor, mockFetchScore: isolatedFetchScore }) => {
      isolatedFetchScore.mockResolvedValue(MOCK_SCORE);

      const { result } = isolatedRenderHook(() => isolatedUseWeekData('peak-1', 'token'));
      await isolatedWaitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data).not.toBeNull();
    });
  });

  it('couvre la branche debug en cas de fetch totalement en échec', async () => {
    await runIsolatedWeekDataTestWithDebug(true, async ({ useWeekData: isolatedUseWeekData, renderHook: isolatedRenderHook, waitFor: isolatedWaitFor, mockFetchScore: isolatedFetchScore }) => {
      isolatedFetchScore.mockRejectedValue(new Error('503 Service Unavailable'));

      const { result } = isolatedRenderHook(() => isolatedUseWeekData('peak-1', 'token'));
      await isolatedWaitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('Service momentanément indisponible');
    });
  });

  it('tie-break : 06h remplace 20h si traité après et même score (branche bestDay=candidate)', async () => {
    const today = '2026-03-24';
    // 20h traité en premier → bestDay=20h, puis 6h : TIEBREAKER[6]=0 < TIEBREAKER[20]=7 → bestDay=6h (ligne 53)
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        byDate: {
          [today]: {
            20: { ...MOCK_SCORE, score: 72 },
            6: { ...MOCK_SCORE, score: 72 },
          },
        },
        cachedAt: Date.now(),
      }),
    );

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.bestByDate[today].hour).toBe(6);
  });

  it('tie-break : une heure inconnue en bestDay et heure inconnue en candidate (deux ?? 99)', async () => {
    const today = '2026-03-24';
    // heure 7 et 9 ne sont pas dans TIEBREAKER → TIEBREAKER[7] ?? 99 = 99, TIEBREAKER[9] ?? 99 = 99
    // 7 traité en premier (bestDay=7), puis 9 : scores égaux, 99 < 99 = false → bestDay reste 7
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        byDate: {
          [today]: {
            7: { ...MOCK_SCORE, score: 72 },
            9: { ...MOCK_SCORE, score: 72 },
          },
        },
        cachedAt: Date.now(),
      }),
    );

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).not.toBeNull();
    // bestDay reste 7 (premier traité) car les deux ?? 99 sont égaux
    expect(result.current.data!.bestByDate[today].hour).toBe(7);
  });

  it('tie-break : couvre la branche ?? 99 pour une heure inconnue du TIEBREAKER', async () => {
    const today = '2026-03-24';
    // heure 7 n'est pas dans TIEBREAKER → TIEBREAKER[7] ?? 99 = 99
    // heure 6 est dans TIEBREAKER → TIEBREAKER[6] ?? 99 = 0
    // 7 traité en premier (bestDay=7 via !bestDay), puis 6: scores égaux, 0 < 99 → bestDay=6 (ligne 53, branche ??)
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        byDate: {
          [today]: {
            7: { ...MOCK_SCORE, score: 72 },
            6: { ...MOCK_SCORE, score: 72 },
          },
        },
        cachedAt: Date.now(),
      }),
    );

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.bestByDate[today].hour).toBe(6);
  });

  it('retourne QUOTA_EXCEEDED quand tous les fetches echouent avec ce code', async () => {
    const quotaErr = new Error('Quota exceeded') as Error & { code: string };
    quotaErr.code = 'QUOTA_EXCEEDED';
    mockFetchScore.mockRejectedValue(quotaErr);

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('QUOTA_EXCEEDED');
    expect(result.current.quotaExceeded).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('ouvre le paywall des le premier QUOTA_EXCEEDED meme si des donnees partielles existent', async () => {
    const quotaErr = new Error('Quota exceeded') as Error & { code: string };
    quotaErr.code = 'QUOTA_EXCEEDED';
    let callCount = 0;
    mockFetchScore.mockImplementation(async () => {
      callCount++;
      // Les 9 premiers appels reussissent, le reste echoue avec quota
      if (callCount <= 9) {
        return MOCK_SCORE;
      }
      throw quotaErr;
    });

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.quotaExceeded).toBe(true);
    expect(result.current.error).toBe('QUOTA_EXCEEDED');
  });

  it('refresh() force un fetch réseau même si le cache est valide', async () => {
    const today = '2026-03-24';
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        byDate: { [today]: { 6: MOCK_SCORE } },
        cachedAt: Date.now(),
      }),
    );

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fromCache).toBe(true);
    expect(mockFetchScore).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => expect(result.current.fromCache).toBe(false));

    expect(mockFetchScore).toHaveBeenCalledTimes(63);
  });

  it('refresh() garde les données de cache affichées si le fetch échoue', async () => {
    const today = '2026-03-24';
    const cachedAt = Date.now();
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        byDate: { [today]: { 6: MOCK_SCORE } },
        cachedAt,
      }),
    );

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const cachedData = result.current.data;

    mockFetchScore.mockRejectedValue(new Error('Network error'));
    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(cachedData);
    await waitFor(() => expect(result.current.fromCache).toBe(true));
    expect(result.current.cachedAt).toBe(cachedAt);
  });

  it('refresh() en ligne mais fetch totalement en échec garde fromCache et cachedAt intacts', async () => {
    const today = '2026-03-24';
    const cachedAt = Date.now();
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        byDate: { [today]: { 6: MOCK_SCORE } },
        cachedAt,
      }),
    );

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fromCache).toBe(true);
    expect(result.current.cachedAt).toBe(cachedAt);

    // Toujours en ligne, mais tous les appels réseau du refresh échouent
    mockNetInfoFetch.mockResolvedValueOnce({ isConnected: true } as never);
    mockFetchScore.mockRejectedValue(new Error('Network error'));
    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fromCache).toBe(true);
    expect(result.current.cachedAt).toBe(cachedAt);
    expect(result.current.data).not.toBeNull();
  });

  it("retourne OFFLINE_NO_CACHE si hors-ligne et aucun cache valide, sans appeler fetchScore", async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
    mockNetInfoFetch.mockResolvedValueOnce({ isConnected: false } as never);

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('OFFLINE_NO_CACHE');
    expect(result.current.data).toBeNull();
    expect(mockFetchScore).not.toHaveBeenCalled();
  });

  it("retourne OFFLINE_NO_CACHE si le cache est expiré et hors-ligne", async () => {
    const today = '2026-03-24';
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        byDate: { [today]: { 6: MOCK_SCORE } },
        cachedAt: Date.now() - (3 * 60 * 60 * 1000 + 60 * 1000),
      }),
    );
    mockNetInfoFetch.mockResolvedValueOnce({ isConnected: false } as never);

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('OFFLINE_NO_CACHE');
    expect(mockFetchScore).not.toHaveBeenCalled();
  });

  it("refresh() hors-ligne garde les donnees affichees sans erreur bloquante", async () => {
    const today = '2026-03-24';
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        byDate: { [today]: { 6: MOCK_SCORE } },
        cachedAt: Date.now(),
      }),
    );

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const cachedData = result.current.data;

    mockNetInfoFetch.mockResolvedValueOnce({ isConnected: false } as never);
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.data).toEqual(cachedData);
    expect(result.current.error).toBeNull();
    expect(mockFetchScore).not.toHaveBeenCalled();
  });
});
