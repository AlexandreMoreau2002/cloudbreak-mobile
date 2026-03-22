import { useFavorites } from '@/hooks/useFavorites';
import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockFetchFavorites = jest.fn();
const mockRemoveFavorite = jest.fn();
const mockAddFavorite = jest.fn();

jest.mock('@/services/api/peaks', () => ({
  fetchFavorites: (...args: unknown[]) => mockFetchFavorites(...args),
  removeFavorite: (...args: unknown[]) => mockRemoveFavorite(...args),
  searchPeaks: jest.fn(),
}));

jest.mock('@/services/api/user', () => ({
  addFavorite: (...args: unknown[]) => mockAddFavorite(...args),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ session: { access_token: 'mock-token' } }),
}));

jest.mock('@/constants/devConfig', () => ({
  MOCK_API: false,
  DEBUG: false,
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
});
