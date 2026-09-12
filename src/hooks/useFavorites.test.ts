import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useFavorites } from '@/hooks/useFavorites';

const mockFetchFavorites = jest.fn();
const mockRemoveFavorite = jest.fn();
const mockAddFavorite = jest.fn();
const mockRequireAccount = jest.fn();
const mockAuthState = {
  session: { access_token: 'mock-token', user: { id: 'user-1' } } as { access_token: string; user: { id: string } } | null,
  isAnonymous: false,
};
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

jest.mock('@/contexts/AccountGateContext', () => ({
  useAccountGate: () => ({ requireAccount: mockRequireAccount }),
}));

jest.mock('@/constants/devConfig', () => ({
  get MOCK_API() { return mockDevConfigState.MOCK_API; },
  get DEBUG() { return mockDevConfigState.DEBUG; },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn() },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNetInfoFetch = NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>;

const MOCK_PEAK_1 = { id: 'peak-1', name: 'Mont Blanc', slug: 'mont-blanc', lat: 45.83, lng: 6.87, altitude: 4808 };
const MOCK_PEAK_2 = { id: 'peak-2', name: 'Ventoux', slug: 'mont-ventoux', lat: 44.17, lng: 5.28, altitude: 1909 };

const MOCK_FAVORITES = [
  { id: 'fav-1', peak_id: MOCK_PEAK_1.id, peak: MOCK_PEAK_1, created_at: '2024-01-01T00:00:00Z' },
  { id: 'fav-2', peak_id: MOCK_PEAK_2.id, peak: MOCK_PEAK_2, created_at: '2024-01-02T00:00:00Z' },
];

const CACHE_KEY = 'cache:favorites:v1:user-1';

describe('useFavorites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.session = { access_token: 'mock-token', user: { id: 'user-1' } };
    mockAuthState.isAnonymous = false;
    mockDevConfigState.MOCK_API = false;
    mockDevConfigState.DEBUG = false;
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockNetInfoFetch.mockResolvedValue({ isConnected: true } as never);
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

  it('écrit en cache après un chargement réseau réussi', async () => {
    mockFetchFavorites.mockResolvedValue(MOCK_FAVORITES);
    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.state.status).toBe('success'));

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      CACHE_KEY,
      expect.stringContaining('"peaks"'),
    );
    expect(result.current.fromCache).toBe(false);
  });

  it('retombe sur le cache si le fetch réseau échoue (cache hit)', async () => {
    const cachedAt = Date.now() - 60_000;
    mockAsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ peaks: [MOCK_PEAK_1], cachedAt }),
    );
    mockFetchFavorites.mockRejectedValue(new Error('Erreur réseau'));

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.state.status).toBe('success'));

    expect(result.current.state.data).toEqual([MOCK_PEAK_1]);
    expect(result.current.fromCache).toBe(true);
    expect(result.current.cachedAt).toBe(cachedAt);
  });

  it('log le fallback cache en mode debug si le fetch échoue (cache hit)', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.DEBUG = true;
    const cachedAt = Date.now() - 60_000;
    mockAsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ peaks: [MOCK_PEAK_1], cachedAt }),
    );
    mockFetchFavorites.mockRejectedValue(new Error('Erreur réseau'));

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.state.status).toBe('success'));

    expect(consoleSpy).toHaveBeenCalledWith(
      '[useFavorites] fetch failed, fallback cache',
      expect.objectContaining({ count: 1 }),
    );
    consoleSpy.mockRestore();
  });

  it('ignore le cache expiré (TTL 3h dépassé) si le fetch échoue', async () => {
    const cachedAt = Date.now() - 4 * 60 * 60 * 1000; // 4h — expiré
    mockAsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ peaks: [MOCK_PEAK_1], cachedAt }),
    );
    mockFetchFavorites.mockRejectedValue(new Error('Erreur réseau'));

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.state.status).toBe('error'));

    expect(result.current.state.error).toBe('Erreur réseau');
    expect(result.current.fromCache).toBe(false);
  });

  it('ignore un cache corrompu (JSON invalide) et retombe en erreur', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('not-json{{{');
    mockFetchFavorites.mockRejectedValue(new Error('Erreur réseau'));

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.state.status).toBe('error'));

    expect(result.current.state.error).toBe('Erreur réseau');
  });

  it('passe en erreur si fetchFavorites rejette et aucun cache disponible', async () => {
    mockFetchFavorites.mockRejectedValue(new Error('Erreur réseau'));
    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });

    expect(result.current.state.error).toBe('Erreur réseau');
  });

  it('retombe sur le cache si hors-ligne au chargement (cache hit)', async () => {
    const cachedAt = Date.now() - 30_000;
    mockNetInfoFetch.mockResolvedValue({ isConnected: false } as never);
    mockAsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ peaks: [MOCK_PEAK_2], cachedAt }),
    );

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.state.status).toBe('success'));

    expect(result.current.state.data).toEqual([MOCK_PEAK_2]);
    expect(result.current.fromCache).toBe(true);
    expect(mockFetchFavorites).not.toHaveBeenCalled();
  });

  it('log le fallback cache en mode debug si hors-ligne au chargement (cache hit)', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.DEBUG = true;
    const cachedAt = Date.now() - 30_000;
    mockNetInfoFetch.mockResolvedValue({ isConnected: false } as never);
    mockAsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ peaks: [MOCK_PEAK_2], cachedAt }),
    );

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.state.status).toBe('success'));

    expect(consoleSpy).toHaveBeenCalledWith(
      '[useFavorites] offline, fallback cache',
      expect.objectContaining({ count: 1 }),
    );
    consoleSpy.mockRestore();
  });

  it('erreur OFFLINE_NO_CACHE si hors-ligne et aucun cache', async () => {
    mockNetInfoFetch.mockResolvedValue({ isConnected: false } as never);
    mockAsyncStorage.getItem.mockResolvedValue(null);

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.state.status).toBe('error'));

    expect(result.current.state.error).toBe('OFFLINE_NO_CACHE');
    expect(mockFetchFavorites).not.toHaveBeenCalled();
  });

  it('ignore le cache hors-ligne en mode MOCK_API (OFFLINE_NO_CACHE)', async () => {
    mockDevConfigState.MOCK_API = true;
    mockNetInfoFetch.mockResolvedValue({ isConnected: false } as never);
    mockAsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ peaks: [MOCK_PEAK_1], cachedAt: Date.now() }),
    );

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.state.status).toBe('error'));

    expect(result.current.state.error).toBe('OFFLINE_NO_CACHE');
  });

  it('ignore le cache de fallback en mode MOCK_API si le fetch échoue', async () => {
    mockDevConfigState.MOCK_API = true;
    mockAsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ peaks: [MOCK_PEAK_1], cachedAt: Date.now() }),
    );
    mockFetchFavorites.mockRejectedValue(new Error('Erreur réseau'));

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.state.status).toBe('error'));

    expect(result.current.state.error).toBe('Erreur réseau');
  });

  it('n\'écrit pas en cache en mode MOCK_API', async () => {
    mockDevConfigState.MOCK_API = true;
    mockFetchFavorites.mockResolvedValue(MOCK_FAVORITES);

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
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

  it('un invité ouvre account au lieu d’appeler le backend pour ajouter un favori', async () => {
    mockAuthState.isAnonymous = true;
    mockFetchFavorites.mockResolvedValue(MOCK_FAVORITES);
    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.state).toEqual({ status: 'success', data: [] }));
    await act(async () => result.current.addFavorite('peak-3'));

    expect(mockRequireAccount).toHaveBeenCalledWith({ kind: 'favorite', peakId: 'peak-3' });
    expect(mockAddFavorite).not.toHaveBeenCalled();
    expect(mockFetchFavorites).not.toHaveBeenCalled();
  });

  it('un invité obtient une liste vide sûre sans requête favoris ni cache', async () => {
    mockAuthState.isAnonymous = true;
    const { result } = renderHook(() => useFavorites());

    await waitFor(() => expect(result.current.state).toEqual({ status: 'success', data: [] }));

    expect(mockNetInfoFetch).not.toHaveBeenCalled();
    expect(mockFetchFavorites).not.toHaveBeenCalled();
    expect(mockAsyncStorage.getItem).not.toHaveBeenCalled();
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

  it('ignore removeFavorite pour une session invitée', async () => {
    mockAuthState.isAnonymous = true;
    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => result.current.removeFavorite('peak-3'));

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
