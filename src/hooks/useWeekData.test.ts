import NetInfo from '@react-native-community/netinfo';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { addDays } from '@/utils/dateUtils';
import { fetchWeekScores } from '@/services/api/score';
import { useWeekData, type WeekData } from '@/hooks/useWeekData';

jest.mock('@/services/api/score', () => ({ fetchWeekScores: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/constants/devConfig', () => ({ DEBUG: false, MOCK_API: false }));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn() },
}));

const mockFetchWeekScores = jest.mocked(fetchWeekScores);
const mockAsyncStorage = jest.mocked(AsyncStorage);
const mockNetInfoFetch = jest.mocked(NetInfo.fetch);
const TODAY = '2026-03-24';
const HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22];
const MOCK_SCORE = {
  score: 72,
  verdict: 'high' as const,
  label: 'Élevée',
  label_code: 'score.label.high',
  cloud_base: 900,
  peak_name: 'Test Peak',
  peak_altitude: 1800,
  peak_region: null,
  peak_slug: 'test-peak',
  prediction_id: 'prediction-1',
  context_message: 'Conditions favorables',
  context_code: 'score.context.high.classic',
  context_params: null,
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

function makeWeekData(score = MOCK_SCORE): WeekData {
  const byDate = Object.fromEntries(
    Array.from({ length: 7 }, (_, index) => {
      const date = addDays(TODAY, index);
      return [date, Object.fromEntries(HOURS.map((hour) => [hour, score]))];
    }),
  );
  return {
    byDate,
    bestByDate: Object.fromEntries(
      Object.keys(byDate).map((date) => [date, { score: score.score, verdict: score.verdict, hour: 6 }]),
    ),
  };
}

function semanticError(code: string): Error & { code: string; httpStatus: number } {
  return Object.assign(new Error(code), { code, httpStatus: 429 });
}

describe('useWeekData', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T08:00:00Z`));
    jest.clearAllMocks();
    mockFetchWeekScores.mockResolvedValue(makeWeekData());
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockNetInfoFetch.mockResolvedValue({ isConnected: true } as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses one weekly request rather than 63 score requests', async () => {
    const { result } = renderHook(() => useWeekData('peak-1', 'token'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetchWeekScores).toHaveBeenCalledTimes(1);
    expect(mockFetchWeekScores).toHaveBeenCalledWith('token', 'peak-1', TODAY);
    expect(Object.keys(result.current.data?.byDate ?? {})).toHaveLength(7);
  });

  it('uses a valid cache without a network request', async () => {
    const cachedAt = Date.now();
    const cachedData = makeWeekData();
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({ byDate: cachedData.byDate, cachedAt }));

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual(cachedData);
    expect(result.current.fromCache).toBe(true);
    expect(result.current.cachedAt).toBe(cachedAt);
    expect(mockFetchWeekScores).not.toHaveBeenCalled();
  });

  it('uses the best higher score then its tie-break hour from cached data', async () => {
    const cachedData = makeWeekData();
    for (const date of Object.keys(cachedData.byDate)) {
      cachedData.byDate[date][6] = { ...MOCK_SCORE, score: 0 };
      cachedData.byDate[date][8] = { ...MOCK_SCORE, score: 0 };
      cachedData.byDate[date][10] = { ...MOCK_SCORE, score: 90 };
      cachedData.byDate[date][14] = { ...MOCK_SCORE, score: 90 };
    }
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({ byDate: cachedData.byDate, cachedAt: Date.now() }));

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.bestByDate[TODAY]).toMatchObject({ score: 90, hour: 14 });
    expect(mockFetchWeekScores).not.toHaveBeenCalled();
  });

  it('keeps a valid cache while a forced refresh is quota limited', async () => {
    const cachedAt = Date.now();
    const cachedData = makeWeekData();
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({ byDate: cachedData.byDate, cachedAt }));
    mockFetchWeekScores.mockRejectedValueOnce(semanticError('QUOTA_EXCEEDED'));

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.fromCache).toBe(true));

    await act(async () => result.current.refresh());

    expect(result.current.data).toEqual(cachedData);
    expect(result.current.fromCache).toBe(true);
    expect(result.current.quotaExceeded).toBe(true);
    expect(result.current.rateLimited).toBe(false);
    expect(result.current.error).toBe('QUOTA_EXCEEDED');
  });

  it('keeps a valid cache and exposes rateLimited without treating it as quota', async () => {
    const cachedData = makeWeekData();
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({ byDate: cachedData.byDate, cachedAt: Date.now() }));
    mockFetchWeekScores.mockRejectedValueOnce(semanticError('RATE_LIMIT_EXCEEDED'));

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.fromCache).toBe(true));
    await act(async () => result.current.refresh());

    expect(result.current.data).toEqual(cachedData);
    expect(result.current.rateLimited).toBe(true);
    expect(result.current.quotaExceeded).toBe(false);
    expect(result.current.error).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('keeps an unknown 429 generic instead of opening a quota or rate-limit state', async () => {
    mockFetchWeekScores.mockRejectedValueOnce(semanticError('SOME_OTHER_429'));

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Erreur de chargement');
    expect(result.current.quotaExceeded).toBe(false);
    expect(result.current.rateLimited).toBe(false);
  });

  it('keeps cached data when a provider or network refresh fails', async () => {
    const cachedData = makeWeekData();
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({ byDate: cachedData.byDate, cachedAt: Date.now() }));
    mockFetchWeekScores.mockRejectedValueOnce(new Error('Service unavailable'));

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.fromCache).toBe(true));
    await act(async () => result.current.refresh());

    expect(result.current.data).toEqual(cachedData);
    expect(result.current.fromCache).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('bypasses an expired cache and replaces it with one fresh batch', async () => {
    const cachedData = makeWeekData({ ...MOCK_SCORE, score: 10 });
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({
      byDate: cachedData.byDate,
      cachedAt: Date.now() - (3 * 60 * 60 * 1000 + 1),
    }));

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetchWeekScores).toHaveBeenCalledTimes(1);
    expect(result.current.data?.byDate[TODAY][6].score).toBe(72);
    expect(mockAsyncStorage.setItem.mock.calls[0][0]).toContain('cache:weekdata:v5:peak-1:2026-03-24');
  });

  it('bypasses a partial cache and replaces it with a complete fresh batch', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({
      byDate: { [TODAY]: { 6: MOCK_SCORE } },
      cachedAt: Date.now(),
    }));

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetchWeekScores).toHaveBeenCalledTimes(1);
    expect(Object.keys(result.current.data?.byDate ?? {})).toHaveLength(7);
  });

  it('clears stale semantic flags after a successful forced refresh', async () => {
    mockFetchWeekScores.mockRejectedValueOnce(semanticError('RATE_LIMIT_EXCEEDED'));
    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.rateLimited).toBe(true));

    mockFetchWeekScores.mockResolvedValueOnce(makeWeekData({ ...MOCK_SCORE, score: 91 }));
    await act(async () => result.current.refresh());

    expect(result.current.rateLimited).toBe(false);
    expect(result.current.quotaExceeded).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data?.byDate[TODAY][6].score).toBe(91);
  });

  it('returns OFFLINE_NO_CACHE without requesting the batch', async () => {
    mockNetInfoFetch.mockResolvedValueOnce({ isConnected: false } as never);

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('OFFLINE_NO_CACHE');
    expect(mockFetchWeekScores).not.toHaveBeenCalled();
  });

  it('keeps the cache during a forced refresh while offline', async () => {
    const cachedAt = Date.now();
    const cachedData = makeWeekData();
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({ byDate: cachedData.byDate, cachedAt }));

    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.fromCache).toBe(true));
    mockNetInfoFetch.mockResolvedValueOnce({ isConnected: false } as never);

    await act(async () => result.current.refresh());

    expect(result.current.data).toEqual(cachedData);
    expect(result.current.isOffline).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockFetchWeekScores).not.toHaveBeenCalled();
  });

  it('keeps already rendered data during a forced offline refresh when the cache read fails', async () => {
    const { result } = renderHook(() => useWeekData('peak-1', 'token'));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
    mockNetInfoFetch.mockResolvedValueOnce({ isConnected: false } as never);

    await act(async () => result.current.refresh());

    expect(result.current.data).not.toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isOffline).toBe(true);
  });

  it('does not request or retain state without a peak or token', async () => {
    const { result } = renderHook(() => useWeekData(null, null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockFetchWeekScores).not.toHaveBeenCalled();
  });
});
