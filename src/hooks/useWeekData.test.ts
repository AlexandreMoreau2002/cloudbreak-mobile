import { fetchScore } from '@/services/api/score';
import { useWeekData } from '@/hooks/useWeekData';
import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/services/api/score', () => ({ fetchScore: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/constants/devConfig', () => ({ DEBUG: false, MOCK_API: true }));

const mockFetchScore = fetchScore as jest.MockedFunction<typeof fetchScore>;

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
  mockFetchScore.mockResolvedValue(MOCK_SCORE);
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

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
    // fetchScore appelé 42 fois (7 jours × 6 créneaux)
    expect(mockFetchScore).toHaveBeenCalledTimes(42);
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
    expect(hours.sort((a, b) => a - b)).toEqual([6, 8, 10, 12, 14, 16]);
  });
});
