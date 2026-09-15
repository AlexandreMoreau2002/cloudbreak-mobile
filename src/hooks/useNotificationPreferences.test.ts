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
    mockUseAuth.mockReturnValue({ session: { access_token: 'tok' }, isAnonymous: false });
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
});
