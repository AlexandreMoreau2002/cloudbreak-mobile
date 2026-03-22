import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePeakSearch } from './usePeakSearch';

const mockSearchPeaks = jest.fn();

jest.mock('@/services/api/peaks', () => ({
  searchPeaks: (...args: unknown[]) => mockSearchPeaks(...args),
  fetchFavorites: jest.fn(),
  removeFavorite: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ session: { access_token: 'mock-token' } }),
}));

jest.mock('@/constants/devConfig', () => ({
  MOCK_API: false,
  DEBUG: false,
}));

const MOCK_PEAKS = [
  { id: 'peak-1', name: 'Mont Blanc', slug: 'mont-blanc', lat: 45.83, lng: 6.87, altitude: 4808 },
  { id: 'peak-2', name: 'Mont Ventoux', slug: 'mont-ventoux', lat: 44.17, lng: 5.28, altitude: 1909 },
];

describe('usePeakSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
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
    expect(mockSearchPeaks).toHaveBeenCalledWith('mock-token', 'mo');
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
    expect(mockSearchPeaks).toHaveBeenCalledWith('mock-token', 'mont');
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
});
