import { usePeakSearch } from '@/hooks/usePeakSearch';
import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockSearchPeaks = jest.fn();
const mockAuthState = { session: { access_token: 'mock-token' } as { access_token: string } | null };
const mockDevConfigState = { MOCK_API: false, DEBUG: false };

jest.mock('@/services/api/peaks', () => ({
  searchPeaks: (...args: unknown[]) => mockSearchPeaks(...args),
  fetchFavorites: jest.fn(),
  removeFavorite: jest.fn(),
}));

jest.mock('@/services/analytics', () => ({
  track: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('@/constants/devConfig', () => ({
  get MOCK_API() { return mockDevConfigState.MOCK_API; },
  get DEBUG() { return mockDevConfigState.DEBUG; },
}));

const MOCK_PEAKS = [
  { id: 'peak-1', name: 'Mont Blanc', slug: 'mont-blanc', lat: 45.83, lng: 6.87, altitude: 4808 },
  { id: 'peak-2', name: 'Mont Ventoux', slug: 'mont-ventoux', lat: 44.17, lng: 5.28, altitude: 1909 },
];

describe('usePeakSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockAuthState.session = { access_token: 'mock-token' };
    mockDevConfigState.MOCK_API = false;
    mockDevConfigState.DEBUG = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('démarre en état idle', () => {
    const { result } = renderHook(() => usePeakSearch());
    expect(result.current.state.status).toBe('idle');
    expect(result.current.query).toBe('');
  });

  it('reste idle si query < 2 caractères', () => {
    const { result } = renderHook(() => usePeakSearch());

    act(() => { result.current.setQuery('m'); });
    act(() => { jest.runAllTimers(); });

    expect(result.current.state.status).toBe('idle');
    expect(mockSearchPeaks).not.toHaveBeenCalled();
  });

  it('passe en loading puis success avec 2 caractères ou plus', async () => {
    mockSearchPeaks.mockResolvedValue(MOCK_PEAKS);
    const { result } = renderHook(() => usePeakSearch());

    act(() => { result.current.setQuery('mo'); });
    expect(result.current.state.status).toBe('loading');

    act(() => { jest.runAllTimers(); });

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    expect(result.current.state.data).toEqual(MOCK_PEAKS);
    expect(mockSearchPeaks).toHaveBeenCalledWith('mock-token', 'mo', expect.any(AbortSignal));
  });

  it('debounce: n\'appelle l\'API qu\'une seule fois après plusieurs frappes rapides', async () => {
    mockSearchPeaks.mockResolvedValue([]);
    const { result } = renderHook(() => usePeakSearch());

    act(() => { result.current.setQuery('mo'); });
    act(() => { result.current.setQuery('mon'); });
    act(() => { result.current.setQuery('mont'); });
    act(() => { jest.runAllTimers(); });

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    expect(mockSearchPeaks).toHaveBeenCalledTimes(1);
    expect(mockSearchPeaks).toHaveBeenCalledWith('mock-token', 'mont', expect.any(AbortSignal));
  });

  it('AbortController: annule la requête en vol quand une nouvelle query est lancée', async () => {
    let resolveFirst!: (value: typeof MOCK_PEAKS) => void;
    const firstRequest = new Promise<typeof MOCK_PEAKS>((resolve) => { resolveFirst = resolve; });
    mockSearchPeaks
      .mockResolvedValueOnce([MOCK_PEAKS[0]])
      .mockImplementationOnce((_token, _query, signal: AbortSignal) =>
        new Promise<typeof MOCK_PEAKS>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(Object.assign(new Error('AbortError'), { name: 'AbortError' })));
          firstRequest.then(_resolve);
        })
      );

    const { result } = renderHook(() => usePeakSearch());

    // First query fires
    act(() => { result.current.setQuery('mo'); });
    act(() => { jest.runAllTimers(); });

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    // Second query — aborts the in-flight request of the first
    act(() => { result.current.setQuery('mon'); });
    act(() => { jest.runAllTimers(); });

    // Resolve the first (now aborted) request — state must not regress to first result
    resolveFirst(MOCK_PEAKS);

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    // Last call is the second query
    expect(mockSearchPeaks).toHaveBeenLastCalledWith('mock-token', 'mon', expect.any(AbortSignal));
  });

  it('ignore les AbortError sans passer en erreur', async () => {
    mockSearchPeaks.mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    const { result } = renderHook(() => usePeakSearch());

    act(() => { result.current.setQuery('mo'); });
    act(() => { jest.runAllTimers(); });

    await waitFor(() => {
      expect(result.current.state.status).toBe('loading');
    });

    expect(result.current.state).not.toHaveProperty('error');
  });

  it('repasse en idle si query retombe sous 2 caractères', () => {
    const { result } = renderHook(() => usePeakSearch());

    act(() => { result.current.setQuery('mo'); });
    act(() => { result.current.setQuery('m'); });
    act(() => { jest.runAllTimers(); });

    expect(result.current.state.status).toBe('idle');
    expect(mockSearchPeaks).not.toHaveBeenCalled();
  });

  it('passe en error si searchPeaks rejette', async () => {
    mockSearchPeaks.mockRejectedValue(new Error('Réseau indisponible'));
    const { result } = renderHook(() => usePeakSearch());

    act(() => { result.current.setQuery('mo'); });
    act(() => { jest.runAllTimers(); });

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });

    expect(result.current.state.error).toBe('Réseau indisponible');
  });

  it('tracks search_performed with query_length and results_count on success', async () => {
    const { track } = jest.requireMock('@/services/analytics');
    mockSearchPeaks.mockResolvedValue(MOCK_PEAKS);
    const { result } = renderHook(() => usePeakSearch());

    act(() => { result.current.setQuery('mont'); });
    act(() => { jest.runAllTimers(); });

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    expect(track).toHaveBeenCalledWith('search_performed', { query_length: 4, results_count: 2 });
  });

  it('retourne tableau vide si aucun résultat', async () => {
    mockSearchPeaks.mockResolvedValue([]);
    const { result } = renderHook(() => usePeakSearch());

    act(() => { result.current.setQuery('xyz'); });
    act(() => { jest.runAllTimers(); });

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    expect(result.current.state.data).toEqual([]);
  });

  it('passe en error si aucun token n’est disponible au déclenchement', async () => {
    mockAuthState.session = null;
    const { result } = renderHook(() => usePeakSearch());

    act(() => { result.current.setQuery('mo'); });
    act(() => { jest.runAllTimers(); });

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'error', error: 'Non authentifié' });
    });

    expect(mockSearchPeaks).not.toHaveBeenCalled();
  });

  it('log le succès en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.DEBUG = true;
    mockSearchPeaks.mockResolvedValue(MOCK_PEAKS);

    const { result } = renderHook(() => usePeakSearch());

    act(() => { result.current.setQuery('mo'); });
    act(() => { jest.runAllTimers(); });

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    expect(consoleSpy).toHaveBeenCalledWith('[usePeakSearch] fetching', { query: 'mo' });
    expect(consoleSpy).toHaveBeenCalledWith('[usePeakSearch] success', { count: 2 });
    consoleSpy.mockRestore();
  });

  it('log l’erreur en mode debug et nettoie le timer au unmount', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    mockDevConfigState.DEBUG = true;
    mockSearchPeaks.mockRejectedValue('unexpected error');

    const { result, unmount } = renderHook(() => usePeakSearch());

    act(() => { result.current.setQuery('mo'); });
    act(() => { jest.runAllTimers(); });

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'error', error: 'Erreur inconnue' });
    });

    unmount();

    expect(consoleSpy).toHaveBeenCalledWith('[usePeakSearch] error', { message: 'Erreur inconnue' });
    expect(clearTimeoutSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  it('annule le timer précédent quand la query change avant échéance', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { result } = renderHook(() => usePeakSearch());

    act(() => { result.current.setQuery('mo'); });
    act(() => { result.current.setQuery('mon'); });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('skip le clearTimeout de cleanup si aucun timer valide n’a été stocké', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(
      () => null as unknown as ReturnType<typeof setTimeout>,
    );
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { result, unmount } = renderHook(() => usePeakSearch());

    act(() => { result.current.setQuery('mo'); });
    unmount();

    expect(setTimeoutSpy).toHaveBeenCalled();
    expect(clearTimeoutSpy).not.toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });
});
