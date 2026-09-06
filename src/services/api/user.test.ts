import {
  addFavorite,
  deleteAccount,
  fetchUserSubscription,
  updateNotificationPreferences,
  updatePushToken,
  provisionUser,
  updateUserSurvey,
  fetchMe,
  updateUserPreferences,
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

describe('deleteAccount', () => {
  it('appelle DELETE /api/v1/user avec le token', async () => {
    mockApiFetch.mockResolvedValueOnce(undefined);
    await deleteAccount(TOKEN);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/user', TOKEN, undefined, { method: 'DELETE' });
  });

  it('propage les erreurs API', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Network error'));
    await expect(deleteAccount(TOKEN)).rejects.toThrow('Network error');
  });

  it('résout sans appel réseau en mode MOCK_API', async () => {
    mockDevConfigState.MOCK_API = true;
    await expect(deleteAccount(TOKEN)).resolves.toBeUndefined();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('log deleteAccount en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.MOCK_API = true;
    mockDevConfigState.DEBUG = true;

    await deleteAccount(TOKEN);

    expect(consoleSpy).toHaveBeenCalledWith('[api/user] MOCK deleteAccount');
    consoleSpy.mockRestore();
  });
});

describe('provisionUser', () => {
  it('appelle POST /api/v1/user/provision avec le token', async () => {
    const profile = { supabase_user_id: 'u1', auth_provider: 'email' };
    mockApiFetch.mockResolvedValueOnce(profile);

    await expect(provisionUser(TOKEN)).resolves.toEqual(profile);
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/user/provision', TOKEN, undefined, { method: 'POST' },
    );
  });
});

describe('updateUserSurvey', () => {
  it('appelle PATCH /api/v1/user/survey avec le payload backend', async () => {
    const profile = { supabase_user_id: 'u1', auth_provider: 'email' };
    const survey = {
      acquisitionSource: 'app_store' as const,
      practice: 'hiker' as const,
      newsletterOptIn: true,
    };
    mockApiFetch.mockResolvedValueOnce(profile);

    await expect(updateUserSurvey(TOKEN, survey)).resolves.toEqual(profile);
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/user/survey', TOKEN, undefined, {
        method: 'PATCH',
        body: {
          acquisition_source: 'app_store',
          practice: 'hiker',
          newsletter_opt_in: true,
        },
      },
    );
  });

  it('encode un skip sans inventer de réponses', async () => {
    mockApiFetch.mockResolvedValueOnce({});
    await updateUserSurvey(TOKEN, { newsletterOptIn: false, skipped: true });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/user/survey', TOKEN, undefined, {
        method: 'PATCH', body: { skipped: true },
      },
    );
  });
});

describe('fetchMe', () => {
  it('appelle GET /api/v1/user/me avec le token', async () => {
    const me = { id: 'u1', is_anonymous: false, provisioned: true, newsletter_opt_in: true };
    mockApiFetch.mockResolvedValueOnce(me);

    await expect(fetchMe(TOKEN)).resolves.toEqual(me);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/user/me', TOKEN);
  });
});

describe('updateUserPreferences', () => {
  it('appelle PATCH /api/v1/user/preferences avec newsletter_opt_in', async () => {
    const profile = { supabase_user_id: 'u1', auth_provider: 'email', newsletter_opt_in: false };
    mockApiFetch.mockResolvedValueOnce(profile);

    await expect(updateUserPreferences(TOKEN, false)).resolves.toEqual(profile);
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/user/preferences', TOKEN, undefined, {
        method: 'PATCH', body: { newsletter_opt_in: false },
      },
    );
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
