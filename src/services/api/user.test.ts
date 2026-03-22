import { addFavorite, fetchUserSubscription } from '@/services/api/user';
import { apiFetch } from '@/services/fetchService';

jest.mock('@/services/fetchService', () => ({
  apiFetch: jest.fn(),
  _delay: () => Promise.resolve(),
}));

jest.mock('@/constants/devConfig', () => ({ MOCK_API: false, DEBUG: false }));

const TOKEN = 'test-token';
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

beforeEach(() => jest.clearAllMocks());

describe('fetchUserSubscription', () => {
  it('appelle GET /api/v1/user/subscription', async () => {
    mockApiFetch.mockResolvedValueOnce({ plan: 'free', status: 'active' });
    await fetchUserSubscription(TOKEN);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/user/subscription', TOKEN);
  });
});

describe('addFavorite', () => {
  it('appelle POST /api/v1/user/favorites avec le peak_id', async () => {
    const fav = { id: 'fav-1', peak_id: 'peak-123', peak: {}, created_at: '' };
    mockApiFetch.mockResolvedValueOnce(fav);
    const result = await addFavorite(TOKEN, 'peak-123');
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/user/favorites',
      TOKEN,
      undefined,
      { method: 'POST', body: { peak_id: 'peak-123' } },
    );
    expect(result).toEqual(fav);
  });
});
