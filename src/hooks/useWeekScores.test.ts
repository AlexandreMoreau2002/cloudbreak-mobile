import { fetchScore } from '@/services/api/score';
import { useWeekScores } from '@/hooks/useWeekScores';
import { renderHook, waitFor } from '@testing-library/react-native';

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
  label: 'Élevée',
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
    const { result } = renderHook(() => useWeekScores(null, 'mock-token'));
    expect(result.current).toBeNull();
  });

  it('retourne null si token est null', () => {
    const { result } = renderHook(() => useWeekScores('peak-1', null));
    expect(result.current).toBeNull();
  });

  it('fetche le meilleur score journalier pour 7 jours', async () => {
    mockFetchScore.mockResolvedValue(MOCK_SCORE_FULL as never);

    const { result } = renderHook(() => useWeekScores('peak-1', 'mock-token'));

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
      expect(scores[date]).toEqual({ score: 80, verdict: 'high', hour: 6 });
    }
    expect(mockFetchScore).toHaveBeenCalledTimes(42);
  });

  it('ignore les erreurs de fetch par jour', async () => {
    mockFetchScore.mockImplementation((_token, _peakId, date, hour = 6) => {
      if ((date === '2026-03-24' || date === '2026-03-26') && hour !== 16) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        ...MOCK_SCORE_FULL,
        score: hour === 16 ? 61 : 50,
        verdict: 'medium',
      } as never);
    });

    const { result } = renderHook(() => useWeekScores('peak-1', 'mock-token'));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const scores = result.current!;
    expect(Object.keys(scores)).toHaveLength(7);
    expect(scores['2026-03-24']).toEqual({ score: 61, verdict: 'medium', hour: 16 });
    expect(scores['2026-03-26']).toEqual({ score: 61, verdict: 'medium', hour: 16 });
    expect(scores['2026-03-25']).toEqual({ score: 61, verdict: 'medium', hour: 16 });
    expect(scores['2026-03-27']).toEqual({ score: 61, verdict: 'medium', hour: 16 });
  });

  it("retient le maximum journalier indépendamment de l'heure courante", async () => {
    mockFetchScore.mockImplementation((_token, _peakId, date, hour = 6) => Promise.resolve({
      ...MOCK_SCORE_FULL,
      score: date === '2026-03-27' ? hour : (hour >= 14 ? 39 : 33),
      verdict: hour >= 14 ? 'low' : 'medium',
    } as never));

    const { result } = renderHook(() => useWeekScores('peak-1', 'mock-token'));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current?.['2026-03-24']).toEqual({ score: 39, verdict: 'low', hour: 16 });
    expect(result.current?.['2026-03-27']).toEqual({ score: 16, verdict: 'low', hour: 16 });
  });

  it('privilégie 6h si toute la journée est à 0%', async () => {
    mockFetchScore.mockResolvedValue({
      ...MOCK_SCORE_FULL,
      score: 0,
      verdict: 'none',
    } as never);

    const { result } = renderHook(() => useWeekScores('peak-1', 'mock-token'));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current?.['2026-03-24']).toEqual({ score: 0, verdict: 'none', hour: 6 });
  });

  it('privilégie le lever du soleil en cas d égalité sur le meilleur score', async () => {
    mockFetchScore.mockImplementation((_token, _peakId, _date, hour = 6) => Promise.resolve({
      ...MOCK_SCORE_FULL,
      score: hour === 6 || hour === 16 ? 34 : 12,
      verdict: hour === 6 || hour === 16 ? 'low' : 'none',
    } as never));

    const { result } = renderHook(() => useWeekScores('peak-1', 'mock-token'));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current?.['2026-03-24']).toEqual({ score: 34, verdict: 'low', hour: 6 });
  });

  it('journalise les transitions en mode debug', async () => {
    mockDebug = true;
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    mockFetchScore.mockResolvedValue(MOCK_SCORE_FULL as never);

    const { result } = renderHook(() => useWeekScores('peak-1', 'mock-token'));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(debugSpy).toHaveBeenCalledWith('[useWeekScores] fetching week scores', expect.objectContaining({
      peakId: 'peak-1',
      hours: [6, 8, 10, 12, 14, 16],
    }));
    expect(debugSpy).toHaveBeenCalledWith('[useWeekScores] success', { count: 7 });
    debugSpy.mockRestore();
  });

  it('journalise les branches idle et erreur en mode debug', async () => {
    mockDebug = true;
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);

    const { result } = renderHook(() => useWeekScores(null, null));
    expect(result.current).toBeNull();
    expect(debugSpy).toHaveBeenCalledWith('[useWeekScores] idle — peakId or token missing', {
      peakId: null,
      token: false,
    });

    debugSpy.mockClear();
    mockFetchScore.mockRejectedValue(new Error('boom'));

    const { result: errorResult } = renderHook(() => useWeekScores('peak-1', 'mock-token'));

    await waitFor(() => {
      expect(errorResult.current).toEqual({});
    });

    expect(debugSpy).toHaveBeenCalledWith(
      '[useWeekScores] fetch failed for date/hour',
      expect.objectContaining({
        date: '2026-03-24',
        hour: 6,
        err: expect.any(Error),
      }),
    );
    expect(debugSpy).toHaveBeenCalledWith('[useWeekScores] success', { count: 0 });
    debugSpy.mockRestore();
  });
});
