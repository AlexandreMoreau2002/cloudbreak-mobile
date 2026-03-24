import {
  addFavorite,
  fetchUserSubscription,
  updateNotificationPreferences,
  updatePushToken,
} from '@/services/api/user';
import { apiFetch } from '@/services/fetchService';
import { MOCK_SUBSCRIPTION } from '@/services/mockData/user';

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

describe('fetchUserSubscription', () => {
  it('appelle GET /api/v1/user/subscription', async () => {
    mockApiFetch.mockResolvedValueOnce({ plan: 'free', status: 'active' });
    await fetchUserSubscription(TOKEN);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/user/subscription', TOKEN);
  });

  it('retourne la souscription mock en mode MOCK_API', async () => {
    mockDevConfigState.MOCK_API = true;
    await expect(fetchUserSubscription(TOKEN)).resolves.toEqual(MOCK_SUBSCRIPTION);
  });

  it('log fetchUserSubscription en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.MOCK_API = true;
    mockDevConfigState.DEBUG = true;

    await fetchUserSubscription(TOKEN);

    expect(consoleSpy).toHaveBeenCalledWith('[api/user] MOCK fetchUserSubscription');
    consoleSpy.mockRestore();
  });
});

describe('updateNotificationPreferences', () => {
  it('appelle /api/v1/user/notifications', async () => {
    mockApiFetch.mockResolvedValueOnce(undefined);
    await updateNotificationPreferences(TOKEN, { notif_favorites: true });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/user/notifications', TOKEN);
  });

  it('résout sans appel réseau en mode MOCK_API', async () => {
    mockDevConfigState.MOCK_API = true;
    await expect(
      updateNotificationPreferences(TOKEN, { notif_favorites: false }),
    ).resolves.toBeUndefined();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('log updateNotificationPreferences en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.MOCK_API = true;
    mockDevConfigState.DEBUG = true;
    const prefs = { notif_regional: false };

    await updateNotificationPreferences(TOKEN, prefs);

    expect(consoleSpy).toHaveBeenCalledWith('[api/user] MOCK updateNotificationPreferences', prefs);
    consoleSpy.mockRestore();
  });
});

describe('updatePushToken', () => {
  it('appelle /api/v1/user/push-token', async () => {
    mockApiFetch.mockResolvedValueOnce(undefined);
    await updatePushToken(TOKEN, 'push-token-123');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/user/push-token', TOKEN);
  });

  it('résout sans appel réseau en mode MOCK_API', async () => {
    mockDevConfigState.MOCK_API = true;
    await expect(updatePushToken(TOKEN, 'push-token-123')).resolves.toBeUndefined();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('log updatePushToken en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.MOCK_API = true;
    mockDevConfigState.DEBUG = true;

    await updatePushToken(TOKEN, 'push-token-123');

    expect(consoleSpy).toHaveBeenCalledWith('[api/user] MOCK updatePushToken');
    consoleSpy.mockRestore();
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

  it('retourne un favori mock en mode MOCK_API', async () => {
    mockDevConfigState.MOCK_API = true;
    const result = await addFavorite(TOKEN, 'peak-123');

    expect(result.peak_id).toBe('peak-123');
    expect(result.id).toBe('fav-mock-peak-123');
    expect(result.peak.slug).toBe('mock-peak');
  });

  it('log addFavorite en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.MOCK_API = true;
    mockDevConfigState.DEBUG = true;

    await addFavorite(TOKEN, 'peak-123');

    expect(consoleSpy).toHaveBeenCalledWith('[api/user] MOCK addFavorite', { peak_id: 'peak-123' });
    consoleSpy.mockRestore();
  });
});
