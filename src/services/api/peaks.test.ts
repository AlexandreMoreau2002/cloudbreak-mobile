import { searchPeaks, fetchPeakBySlug, fetchFavorites, removeFavorite } from '@/services/api/peaks';
import { apiFetch } from '@/services/fetchService';
import { MOCK_PEAKS } from '@/services/mockData/peaks';

const mockDevConfigState = { MOCK_API: false, DEBUG: false };

jest.mock('@/services/fetchService', () => ({
  apiFetch: jest.fn(),
  _delay: () => Promise.resolve(),
}));

jest.mock('@/constants/devConfig', () => ({
  get MOCK_API() { return mockDevConfigState.MOCK_API; },
  get DEBUG() { return mockDevConfigState.DEBUG; },
}));

const TOKEN = 'test-token';
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

beforeEach(() => {
  jest.clearAllMocks();
  mockDevConfigState.MOCK_API = false;
  mockDevConfigState.DEBUG = false;
});

describe('searchPeaks', () => {
  it('appelle GET /api/v1/peaks/search avec le query', async () => {
    mockApiFetch.mockResolvedValueOnce([]);
    await searchPeaks(TOKEN, 'mont');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/peaks/search', TOKEN, { q: 'mont' });
  });

  it('retourne les résultats de l\'API', async () => {
    const peaks = [MOCK_PEAKS[0]];
    mockApiFetch.mockResolvedValueOnce(peaks);
    const result = await searchPeaks(TOKEN, 'mont');
    expect(result).toEqual(peaks);
  });

  it('retourne les résultats mock filtrés en mode MOCK_API', async () => {
    mockDevConfigState.MOCK_API = true;
    const result = await searchPeaks(TOKEN, 'mont');
    expect(result).toEqual([MOCK_PEAKS[0], MOCK_PEAKS[2]]);
  });

  it('log searchPeaks en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.MOCK_API = true;
    mockDevConfigState.DEBUG = true;

    await searchPeaks(TOKEN, 'mont');

    expect(consoleSpy).toHaveBeenCalledWith('[api/peaks] MOCK searchPeaks', { query: 'mont' });
    consoleSpy.mockRestore();
  });
});

describe('fetchPeakBySlug', () => {
  it('appelle GET /api/v1/peaks/{slug}', async () => {
    mockApiFetch.mockResolvedValueOnce(MOCK_PEAKS[0]);
    await fetchPeakBySlug(TOKEN, 'mont-blanc');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/peaks/mont-blanc', TOKEN);
  });

  it('retourne un pic mock par slug en mode MOCK_API', async () => {
    mockDevConfigState.MOCK_API = true;
    const result = await fetchPeakBySlug(TOKEN, 'mont-blanc');
    expect(result).toEqual(MOCK_PEAKS[0]);
  });

  it('lève une erreur si le slug mock est inconnu', async () => {
    mockDevConfigState.MOCK_API = true;
    await expect(fetchPeakBySlug(TOKEN, 'unknown-peak')).rejects.toThrow('Peak not found');
  });

  it('log fetchPeakBySlug en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.MOCK_API = true;
    mockDevConfigState.DEBUG = true;

    await fetchPeakBySlug(TOKEN, 'mont-blanc');

    expect(consoleSpy).toHaveBeenCalledWith('[api/peaks] MOCK fetchPeakBySlug', { slug: 'mont-blanc' });
    consoleSpy.mockRestore();
  });
});

describe('fetchFavorites', () => {
  it('appelle GET /api/v1/user/favorites', async () => {
    mockApiFetch.mockResolvedValueOnce([]);
    await fetchFavorites(TOKEN);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/user/favorites', TOKEN);
  });

  it('retourne deux favoris mock en mode MOCK_API', async () => {
    mockDevConfigState.MOCK_API = true;
    const result = await fetchFavorites(TOKEN);

    expect(result).toHaveLength(2);
    expect(result[0].peak).toEqual(MOCK_PEAKS[0]);
    expect(result[1].peak).toEqual(MOCK_PEAKS[1]);
  });

  it('log fetchFavorites en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.MOCK_API = true;
    mockDevConfigState.DEBUG = true;

    await fetchFavorites(TOKEN);

    expect(consoleSpy).toHaveBeenCalledWith('[api/peaks] MOCK fetchFavorites');
    consoleSpy.mockRestore();
  });
});

describe('removeFavorite', () => {
  it('appelle DELETE /api/v1/user/favorites/{peak_id}', async () => {
    mockApiFetch.mockResolvedValueOnce(undefined);
    await removeFavorite(TOKEN, 'peak-123');
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/user/favorites/peak-123',
      TOKEN,
      undefined,
      { method: 'DELETE' },
    );
  });

  it('résout sans appel réseau en mode MOCK_API', async () => {
    mockDevConfigState.MOCK_API = true;
    await expect(removeFavorite(TOKEN, 'peak-123')).resolves.toBeUndefined();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('log removeFavorite en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.MOCK_API = true;
    mockDevConfigState.DEBUG = true;

    await removeFavorite(TOKEN, 'peak-123');

    expect(consoleSpy).toHaveBeenCalledWith('[api/peaks] MOCK removeFavorite', { peak_id: 'peak-123' });
    consoleSpy.mockRestore();
  });
});
