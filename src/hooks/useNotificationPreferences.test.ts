import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMe, updateNotificationPreferences } from '@/services/api/user';
import { useNotificationPreferences } from './useNotificationPreferences';

jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/services/api/user');
jest.mock('@/constants/devConfig', () => ({ DEBUG: false, MOCK_API: false }));

const mockUseAuth = useAuth as jest.Mock;
const mockFetchMe = fetchMe as jest.Mock;
const mockUpdate = updateNotificationPreferences as jest.Mock;

describe('useNotificationPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
  });

  it('recharge depuis le backend à chaque montage, même juste après un chargement précédent', async () => {
    mockFetchMe.mockResolvedValue({
      id: 'u1', is_anonymous: false, provisioned: true,
      notif_favorites: true, notif_regional: false, notif_terrain: true,
    });
    const first = renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(first.result.current.state.status).toBe('success'));

    const second = renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(second.result.current.state.status).toBe('success'));

    expect(mockFetchMe).toHaveBeenCalledTimes(2);
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
