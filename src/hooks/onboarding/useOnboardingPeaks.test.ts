import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useOnboardingPeaks } from '@/hooks/onboarding/useOnboardingPeaks';

const mockSearchPeaks = jest.fn();
const mockFetchPeakBySlug = jest.fn();

jest.mock('@/services/api/peaks', () => ({
  searchPeaks: (...args: unknown[]) => mockSearchPeaks(...args),
  fetchPeakBySlug: (...args: unknown[]) => mockFetchPeakBySlug(...args),
}));

jest.mock('@/constants/devConfig', () => ({
  DEBUG: false,
}));

jest.mock('@/constants/onboardingPeaks', () => ({
  CURATED_PEAKS: [
    { slug: 'mont-aiguille', name: 'Mont Aiguille', range: 'Vercors', altitude: 2087 },
    { slug: 'grand-veymont', name: 'Grand Veymont', range: 'Vercors', altitude: 2341 },
  ],
}));

const MOCK_PEAK_1 = { id: 'peak-1', name: 'Mont Aiguille', slug: 'mont-aiguille', lat: 44.9, lng: 5.55, altitude: 2087 };
const MOCK_PEAK_2 = { id: 'peak-2', name: 'Grand Veymont', slug: 'grand-veymont', lat: 44.93, lng: 5.53, altitude: 2341 };

const MOCK_SEARCH_RESULTS = [
  { id: 'peak-3', name: 'Mont Saint-Michel', slug: 'mont-saint-michel', lat: 48.63, lng: -1.51, altitude: 92 },
];

describe('useOnboardingPeaks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockFetchPeakBySlug.mockImplementation((_token: string | null, slug: string) => {
      if (slug === 'mont-aiguille') return Promise.resolve(MOCK_PEAK_1);
      if (slug === 'grand-veymont') return Promise.resolve(MOCK_PEAK_2);
      return Promise.reject(new Error('unknown slug'));
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('charge les sommets curés au montage', async () => {
    const { result } = renderHook(() => useOnboardingPeaks());

    await waitFor(() => {
      expect(result.current.curated.status).toBe('success');
    });

    expect(mockFetchPeakBySlug).toHaveBeenCalledTimes(2);
    expect(mockFetchPeakBySlug).toHaveBeenCalledWith(null, 'mont-aiguille');
    expect(mockFetchPeakBySlug).toHaveBeenCalledWith(null, 'grand-veymont');
    expect(result.current.curated.data).toEqual([MOCK_PEAK_1, MOCK_PEAK_2]);
  });

  it('passe curated en erreur si fetchPeakBySlug rejette', async () => {
    mockFetchPeakBySlug.mockRejectedValue(new Error('Peak not found'));
    const { result } = renderHook(() => useOnboardingPeaks());

    await waitFor(() => {
      expect(result.current.curated.status).toBe('error');
    });

    expect(result.current.curated.error).toBe('Peak not found');
  });

  it('démarre results en idle et query vide', async () => {
    const { result } = renderHook(() => useOnboardingPeaks());

    await waitFor(() => expect(result.current.curated.status).toBe('success'));

    expect(result.current.results.status).toBe('idle');
    expect(result.current.query).toBe('');
  });

  it('reste idle si query < 2 caractères', async () => {
    const { result } = renderHook(() => useOnboardingPeaks());

    await waitFor(() => expect(result.current.curated.status).toBe('success'));

    act(() => { result.current.setQuery('s'); });
    act(() => { jest.runAllTimers(); });

    expect(result.current.results.status).toBe('idle');
    expect(mockSearchPeaks).not.toHaveBeenCalled();
  });

  it('recherche debounced 300ms avec token null', async () => {
    mockSearchPeaks.mockResolvedValue(MOCK_SEARCH_RESULTS);
    const { result } = renderHook(() => useOnboardingPeaks());

    act(() => { result.current.setQuery('saint'); });
    expect(result.current.results.status).toBe('loading');

    act(() => { jest.advanceTimersByTime(299); });
    expect(mockSearchPeaks).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(1); });

    await waitFor(() => {
      expect(result.current.results.status).toBe('success');
    });

    expect(mockSearchPeaks).toHaveBeenCalledWith(null, 'saint', expect.any(AbortSignal));
    expect(result.current.results.data).toEqual(MOCK_SEARCH_RESULTS);
  });

  it('passe results en erreur si searchPeaks rejette', async () => {
    mockSearchPeaks.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useOnboardingPeaks());

    act(() => { result.current.setQuery('saint'); });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(result.current.results.status).toBe('error');
    });

    expect(result.current.results.error).toBe('network down');
  });

  it('avale les AbortError sans passer results en erreur', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    mockSearchPeaks.mockRejectedValue(abortError);
    const { result } = renderHook(() => useOnboardingPeaks());

    act(() => { result.current.setQuery('saint'); });
    await act(async () => { jest.advanceTimersByTime(300); });

    expect(result.current.results.status).toBe('loading');
  });

  it('réinitialise une recherche en attente quand la requête redevient trop courte', async () => {
    const { result } = renderHook(() => useOnboardingPeaks());
    await waitFor(() => expect(result.current.curated.status).toBe('success'));

    act(() => { result.current.setQuery('saint'); });
    act(() => { result.current.setQuery('s'); });

    expect(result.current.results.status).toBe('idle');
    act(() => { jest.advanceTimersByTime(300); });
    expect(mockSearchPeaks).not.toHaveBeenCalled();
  });

  it('utilise un message de repli si un fetch curé rejette une valeur non Error', async () => {
    mockFetchPeakBySlug.mockRejectedValue('offline');
    const { result } = renderHook(() => useOnboardingPeaks());

    await waitFor(() => expect(result.current.curated.status).toBe('error'));

    expect(result.current.curated).toEqual({ status: 'error', error: 'Erreur inconnue' });
  });

  it('n’actualise pas les sommets curés après démontage', async () => {
    const resolvePeaks: ((peak: typeof MOCK_PEAK_1) => void)[] = [];
    mockFetchPeakBySlug.mockImplementation(
      () => new Promise((resolve) => { resolvePeaks.push(resolve); }),
    );
    const { unmount } = renderHook(() => useOnboardingPeaks());

    unmount();
    await act(async () => { resolvePeaks.forEach((resolve) => resolve(MOCK_PEAK_1)); });
  });

  it('utilise le message de repli quand une recherche rejette une valeur non Error', async () => {
    mockSearchPeaks.mockRejectedValue('offline');
    const { result } = renderHook(() => useOnboardingPeaks());
    await waitFor(() => expect(result.current.curated.status).toBe('success'));

    act(() => { result.current.setQuery('saint'); });
    await act(async () => { jest.advanceTimersByTime(300); });

    await waitFor(() => expect(result.current.results).toEqual({ status: 'error', error: 'Erreur inconnue' }));
  });
});
