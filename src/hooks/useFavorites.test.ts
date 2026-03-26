import { useFavorites } from '@/hooks/useFavorites';
import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockFetchFavorites = jest.fn();
const mockRemoveFavorite = jest.fn();
const mockAddFavorite = jest.fn();
const mockAuthState = { session: { access_token: 'mock-token' } as { access_token: string } | null };
const mockDevConfigState = { MOCK_API: false, DEBUG: false };

jest.mock('@/services/api/peaks', () => ({
  fetchFavorites: (...args: unknown[]) => mockFetchFavorites(...args),
  removeFavorite: (...args: unknown[]) => mockRemoveFavorite(...args),
  searchPeaks: jest.fn(),
}));

jest.mock('@/services/api/user', () => ({
  addFavorite: (...args: unknown[]) => mockAddFavorite(...args),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('@/constants/devConfig', () => ({
  get MOCK_API() { return mockDevConfigState.MOCK_API; },
  get DEBUG() { return mockDevConfigState.DEBUG; },
}));

const MOCK_PEAK_1 = { id: 'peak-1', name: 'Mont Blanc', slug: 'mont-blanc', lat: 45.83, lng: 6.87, altitude: 4808 };
const MOCK_PEAK_2 = { id: 'peak-2', name: 'Ventoux', slug: 'mont-ventoux', lat: 44.17, lng: 5.28, altitude: 1909 };

const MOCK_FAVORITES = [
  { id: 'fav-1', peak_id: MOCK_PEAK_1.id, peak: MOCK_PEAK_1, created_at: '2024-01-01T00:00:00Z' },
  { id: 'fav-2', peak_id: MOCK_PEAK_2.id, peak: MOCK_PEAK_2, created_at: '2024-01-02T00:00:00Z' },
];

describe('useFavorites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.session = { access_token: 'mock-token' };
    mockDevConfigState.MOCK_API = false;
    mockDevConfigState.DEBUG = false;
  });

  it('charge les favoris au mount', async () => {
    mockFetchFavorites.mockResolvedValue(MOCK_FAVORITES);
    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    expect(result.current.state.data).toEqual([MOCK_PEAK_1, MOCK_PEAK_2]);
    expect(mockFetchFavorites).toHaveBeenCalledWith('mock-token');
  });

  it('passe en état error si fetchFavorites rejette', async () => {
    mockFetchFavorites.mockRejectedValue(new Error('Erreur réseau'));
    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });

    expect(result.current.state.error).toBe('Erreur réseau');
  });

  it('addFavorite appelle l\'API et recharge la liste', async () => {
    mockFetchFavorites.mockResolvedValue(MOCK_FAVORITES);
    mockAddFavorite.mockResolvedValue({ id: 'fav-new', peak_id: 'peak-3', peak: MOCK_PEAK_1, created_at: '' });

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => {
      await result.current.addFavorite('peak-3');
    });

    expect(mockAddFavorite).toHaveBeenCalledWith('mock-token', 'peak-3');
    expect(mockFetchFavorites).toHaveBeenCalledTimes(2);
  });

  it('removeFavorite appelle l\'API et recharge la liste', async () => {
    mockFetchFavorites.mockResolvedValue(MOCK_FAVORITES);
    mockRemoveFavorite.mockResolvedValue(undefined);

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => {
      await result.current.removeFavorite(MOCK_PEAK_1.id);
    });

    expect(mockRemoveFavorite).toHaveBeenCalledWith('mock-token', MOCK_PEAK_1.id);
    expect(mockFetchFavorites).toHaveBeenCalledTimes(2);
  });

  it('liste vide si fetchFavorites retourne []', async () => {
    mockFetchFavorites.mockResolvedValue([]);
    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    expect(result.current.state.data).toEqual([]);
  });

  it('refresh recharge la liste', async () => {
    mockFetchFavorites.mockResolvedValue(MOCK_FAVORITES);
    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockFetchFavorites).toHaveBeenCalledTimes(2);
  });

  it('passe en erreur si aucun token n’est disponible', async () => {
    mockAuthState.session = null;

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'error', error: 'Non authentifié' });
    });

    expect(mockFetchFavorites).not.toHaveBeenCalled();
  });

  it('ignore addFavorite sans token', async () => {
    mockAuthState.session = null;
    const { result } = renderHook(() => useFavorites());

    await act(async () => {
      await result.current.addFavorite('peak-3');
    });

    expect(mockAddFavorite).not.toHaveBeenCalled();
  });

  it('ignore removeFavorite sans token', async () => {
    mockAuthState.session = null;
    const { result } = renderHook(() => useFavorites());

    await act(async () => {
      await result.current.removeFavorite('peak-3');
    });

    expect(mockRemoveFavorite).not.toHaveBeenCalled();
  });

  it('gère une erreur addFavorite et log en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.DEBUG = true;
    mockFetchFavorites.mockResolvedValue(MOCK_FAVORITES);
    mockAddFavorite.mockRejectedValue('unexpected error');

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => {
      await result.current.addFavorite('peak-3');
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[useFavorites] addFavorite error',
      { message: 'Erreur inconnue' },
    );
    consoleSpy.mockRestore();
  });

  it('gère une erreur removeFavorite et log en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.DEBUG = true;
    mockFetchFavorites.mockResolvedValue(MOCK_FAVORITES);
    mockRemoveFavorite.mockRejectedValue(new Error('remove failed'));

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => {
      await result.current.removeFavorite('peak-1');
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[useFavorites] removeFavorite error',
      { message: 'remove failed' },
    );
    consoleSpy.mockRestore();
  });

  it('log une erreur de chargement initial en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.DEBUG = true;
    mockFetchFavorites.mockRejectedValue(new Error('fetch failed'));

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'error', error: 'fetch failed' });
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[useFavorites] listFavorites error',
      { message: 'fetch failed' },
    );
    consoleSpy.mockRestore();
  });

  it('retourne "Erreur inconnue" si le chargement initial rejette une valeur non Error', async () => {
    mockFetchFavorites.mockRejectedValue('unexpected');

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'error', error: 'Erreur inconnue' });
    });
  });

  it('gère une erreur addFavorite de type Error', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.DEBUG = true;
    mockFetchFavorites.mockResolvedValue(MOCK_FAVORITES);
    mockAddFavorite.mockRejectedValue(new Error('add failed'));

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => {
      await result.current.addFavorite('peak-3');
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[useFavorites] addFavorite error',
      { message: 'add failed' },
    );
    consoleSpy.mockRestore();
  });

  it('gère une erreur addFavorite sans log quand DEBUG est false', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockFetchFavorites.mockResolvedValue(MOCK_FAVORITES);
    mockAddFavorite.mockRejectedValue(new Error('add failed'));

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => {
      await result.current.addFavorite('peak-3');
    });

    expect(consoleSpy).not.toHaveBeenCalledWith(
      '[useFavorites] addFavorite error',
      expect.anything(),
    );
    consoleSpy.mockRestore();
  });

  it('gère une erreur removeFavorite non Error', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.DEBUG = true;
    mockFetchFavorites.mockResolvedValue(MOCK_FAVORITES);
    mockRemoveFavorite.mockRejectedValue('remove failed');

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => {
      await result.current.removeFavorite('peak-1');
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[useFavorites] removeFavorite error',
      { message: 'Erreur inconnue' },
    );
    consoleSpy.mockRestore();
  });

  it('gère une erreur removeFavorite sans log quand DEBUG est false', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockFetchFavorites.mockResolvedValue(MOCK_FAVORITES);
    mockRemoveFavorite.mockRejectedValue(new Error('remove failed'));

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => {
      await result.current.removeFavorite('peak-1');
    });

    expect(consoleSpy).not.toHaveBeenCalledWith(
      '[useFavorites] removeFavorite error',
      expect.anything(),
    );
    consoleSpy.mockRestore();
  });
});
