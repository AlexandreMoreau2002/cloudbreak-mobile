import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMe, updateNotificationPreferences } from '@/services/api/user';
import { useNotificationPreferences } from './useNotificationPreferences';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/services/api/user');
jest.mock('@/constants/devConfig', () => ({ DEBUG: false, MOCK_API: false }));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockUseAuth = useAuth as jest.Mock;
const mockFetchMe = fetchMe as jest.Mock;
const mockUpdate = updateNotificationPreferences as jest.Mock;

describe('useNotificationPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      session: { access_token: 'tok', user: { id: 'u1' } },
      isAnonymous: false,
    });
  });

  it('charge les préférences depuis GET /me au montage', async () => {
    mockFetchMe.mockResolvedValue({
      id: 'u1', is_anonymous: false, provisioned: true,
      notif_favorites: true, notif_regional: false, notif_terrain: true,
    });
    const { result } = renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(result.current.state.status).toBe('success'));
    expect(result.current.state.data).toEqual({
      notif_favorites: true, notif_regional: false, notif_terrain: true,
    });
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'cache:notification-preferences:v1:u1',
      expect.stringContaining('"notif_regional":false'),
    );
  });

  it('utilise les préférences en cache valides avant de joindre le backend', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({
      data: { notif_favorites: false, notif_regional: true, notif_terrain: false },
      cachedAt: Date.now(),
    }));

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => expect(result.current.state.status).toBe('success'));
    expect(result.current.state.data).toEqual({
      notif_favorites: false, notif_regional: true, notif_terrain: false,
    });
    expect(mockFetchMe).not.toHaveBeenCalled();
  });

  it('rafraîchit les préférences lorsque le cache est expiré', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({
      data: { notif_favorites: false, notif_regional: true, notif_terrain: false },
      cachedAt: Date.now() - (3 * 60 * 60 * 1000 + 1),
    }));
    mockFetchMe.mockResolvedValueOnce({
      id: 'u1', is_anonymous: false, provisioned: true,
      notif_favorites: true, notif_regional: false, notif_terrain: true,
    });

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => expect(result.current.state.status).toBe('success'));
    expect(result.current.state.data).toEqual({
      notif_favorites: true, notif_regional: false, notif_terrain: true,
    });
    expect(mockFetchMe).toHaveBeenCalledWith('tok');
  });

  it('met à jour en optimiste puis appelle le PATCH', async () => {
    mockFetchMe.mockResolvedValue({
      id: 'u1', is_anonymous: false, provisioned: true,
      notif_favorites: true, notif_regional: true, notif_terrain: true,
    });
    mockUpdate.mockResolvedValue(undefined);
    const { result } = renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => {
      await result.current.toggle('notif_regional');
    });

    expect(result.current.state.status === 'success' && result.current.state.data?.notif_regional).toBe(false);
    expect(mockUpdate).toHaveBeenCalledWith('tok', { notif_regional: false });
    expect(mockAsyncStorage.setItem).toHaveBeenLastCalledWith(
      'cache:notification-preferences:v1:u1',
      expect.stringContaining('"notif_regional":false'),
    );
  });

  it("revient à l'état précédent si le PATCH échoue", async () => {
    mockFetchMe.mockResolvedValue({
      id: 'u1', is_anonymous: false, provisioned: true,
      notif_favorites: true, notif_regional: true, notif_terrain: true,
    });
    mockUpdate.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => {
      await result.current.toggle('notif_regional');
    });

    expect(result.current.state.status === 'success' && result.current.state.data?.notif_regional).toBe(true);
  });

  it('reste idle pour une session anonyme sans appeler le backend', async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: 'tok', user: { id: 'u1', is_anonymous: true } },
      isAnonymous: true,
    });

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => expect(result.current.state.status).toBe('idle'));
    expect(mockFetchMe).not.toHaveBeenCalled();
  });

  it('reste idle sans token sans appeler le backend', async () => {
    mockUseAuth.mockReturnValue({ session: null, isAnonymous: false });

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => expect(result.current.state.status).toBe('idle'));
    expect(mockFetchMe).not.toHaveBeenCalled();
  });

  it('expose l’erreur initiale quand le chargement des préférences échoue', async () => {
    mockFetchMe.mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(result.current.state).toEqual({ status: 'error', error: 'network' });
  });
});
