import { renderHook, waitFor } from '@testing-library/react-native';
import { fetchScore } from '@/services/api/score';
import { useWeekScores } from '@/hooks/useWeekScores';

jest.mock('@/services/api/score', () => ({
  fetchScore: jest.fn(),
}));
let mockDebug = false;
jest.mock('@/constants/devConfig', () => ({
  get DEBUG() {
    return mockDebug;
  },
  MOCK_API: false,
}));

const mockFetchScore = fetchScore as jest.MockedFunction<typeof fetchScore>;

const MOCK_SCORE_FULL = {
  score: 80,
  verdict: 'high',
  label: 'Lève-toi tôt !',
  cloud_base: 1200,
  peak_name: 'Mont Blanc',
  peak_altitude: 4808,
  peak_slug: 'mont-blanc',
  context_message: '',
  optimal_window_start: null,
  optimal_window_end: null,
  sunrise: null,
  stability_hours: null,
  conditions: null,
  cloud_layer_viz: null,
} as const;

describe('useWeekScores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDebug = false;
    jest.useFakeTimers().setSystemTime(new Date('2026-03-24T08:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retourne null si peakId est null', () => {
    const { result } = renderHook(() => useWeekScores(null, 6, 'mock-token'));
    expect(result.current).toBeNull();
  });

  it('retourne null si token est null', () => {
    const { result } = renderHook(() => useWeekScores('peak-1', 6, null));
    expect(result.current).toBeNull();
  });

  it('fetche les scores pour 7 jours et les retourne par date', async () => {
    mockFetchScore.mockResolvedValue(MOCK_SCORE_FULL as never);

    const { result } = renderHook(() => useWeekScores('peak-1', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const scores = result.current!;
    expect(Object.keys(scores)).toHaveLength(7);

    const expectedDates = [
      '2026-03-24',
      '2026-03-25',
      '2026-03-26',
      '2026-03-27',
      '2026-03-28',
      '2026-03-29',
      '2026-03-30',
    ];
    for (const date of expectedDates) {
      expect(scores[date]).toEqual({ score: 80, verdict: 'high' });
    }
    expect(mockFetchScore).toHaveBeenCalledTimes(7);
  });

  it('ignore les erreurs de fetch par jour', async () => {
    mockFetchScore.mockImplementation((_token, _peakId, date) => {
      if (date === '2026-03-24' || date === '2026-03-26') {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        ...MOCK_SCORE_FULL,
        score: 50,
        verdict: 'medium',
      } as never);
    });

    const { result } = renderHook(() => useWeekScores('peak-1', 6, 'mock-token'));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const scores = result.current!;
    // 5 successful days (7 - 2 failed)
    expect(Object.keys(scores)).toHaveLength(5);
    expect(scores['2026-03-24']).toBeUndefined();
    expect(scores['2026-03-26']).toBeUndefined();
    expect(scores['2026-03-25']).toEqual({ score: 50, verdict: 'medium' });
    expect(scores['2026-03-27']).toEqual({ score: 50, verdict: 'medium' });
  });

  it('journalise les transitions en mode debug', async () => {
    mockDebug = true;
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    mockFetchScore.mockResolvedValue(MOCK_SCORE_FULL as never);

    const { result } = renderHook(() => useWeekScores('peak-1', 8, 'mock-token'));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(debugSpy).toHaveBeenCalledWith('[useWeekScores] fetching week scores', expect.objectContaining({
      peakId: 'peak-1',
      hour: 8,
    }));
    expect(debugSpy).toHaveBeenCalledWith('[useWeekScores] success', { count: 7 });
    debugSpy.mockRestore();
  });

  it('journalise les branches idle et erreur en mode debug', async () => {
    mockDebug = true;
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);

    const { result } = renderHook(() => useWeekScores(null, 6, null));
    expect(result.current).toBeNull();
    expect(debugSpy).toHaveBeenCalledWith('[useWeekScores] idle — peakId or token missing', {
      peakId: null,
      token: false,
    });

    debugSpy.mockClear();
    mockFetchScore.mockRejectedValue(new Error('boom'));

    const { result: errorResult } = renderHook(() => useWeekScores('peak-1', 6, 'mock-token'));

    await waitFor(() => {
      expect(errorResult.current).toEqual({});
    });

    expect(debugSpy).toHaveBeenCalledWith(
      '[useWeekScores] fetch failed for date',
      expect.objectContaining({
        date: '2026-03-24',
        err: expect.any(Error),
      }),
    );
    expect(debugSpy).toHaveBeenCalledWith('[useWeekScores] success', { count: 0 });
    debugSpy.mockRestore();
  });
});
