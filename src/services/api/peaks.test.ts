import { searchPeaks, fetchPeakBySlug, fetchFavorites, removeFavorite } from '@/services/api/peaks';
import { apiFetch } from '@/services/fetchService';
import { MOCK_PEAKS } from '@/services/mockData/peaks';

jest.mock('@/services/fetchService', () => ({
  apiFetch: jest.fn(),
  _delay: () => Promise.resolve(),
}));

jest.mock('@/constants/devConfig', () => ({ MOCK_API: false, DEBUG: false }));

const TOKEN = 'test-token';
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

beforeEach(() => jest.clearAllMocks());

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
});

describe('fetchPeakBySlug', () => {
  it('appelle GET /api/v1/peaks/{slug}', async () => {
    mockApiFetch.mockResolvedValueOnce(MOCK_PEAKS[0]);
    await fetchPeakBySlug(TOKEN, 'mont-blanc');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/peaks/mont-blanc', TOKEN);
  });
});

describe('fetchFavorites', () => {
  it('appelle GET /api/v1/user/favorites', async () => {
    mockApiFetch.mockResolvedValueOnce([]);
    await fetchFavorites(TOKEN);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/user/favorites', TOKEN);
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
});
