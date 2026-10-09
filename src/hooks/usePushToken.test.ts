import * as Notifications from 'expo-notifications';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAuth } from '@/contexts/AuthContext';
import { usePushToken } from '@/hooks/usePushToken';
import { updatePushToken } from '@/services/api/user';

jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/services/api/user', () => ({ updatePushToken: jest.fn() }));

const mockUseAuth = useAuth as jest.Mock;
const mockUpdate = updatePushToken as jest.Mock;
const mockPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockGetToken = Notifications.getExpoPushTokenAsync as jest.Mock;

const flush = () => act(async () => {});

function auth(overrides: object = {}) {
  mockUseAuth.mockReturnValue({
    session: { access_token: 'jwt', user: { id: 'u1', is_anonymous: false } },
    isAnonymous: false,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPermissions.mockResolvedValue({ status: 'granted' });
  mockGetToken.mockResolvedValue({ data: 'ExponentPushToken[abc]' });
  mockUpdate.mockResolvedValue(undefined);
  auth();
});

describe('usePushToken', () => {
  it('envoie le token au backend quand la permission est accordée', async () => {
    renderHook(() => usePushToken());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('jwt', 'ExponentPushToken[abc]'));
  });

  it("n'envoie rien pour un compte anonyme", async () => {
    auth({ isAnonymous: true });
    renderHook(() => usePushToken());
    await flush();
    expect(mockPermissions).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("n'envoie rien sans session", async () => {
    auth({ session: null });
    renderHook(() => usePushToken());
    await flush();
    expect(mockPermissions).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('ne demande pas la permission et ne fait rien si elle est refusée', async () => {
    mockPermissions.mockResolvedValue({ status: 'denied' });
    renderHook(() => usePushToken());
    await waitFor(() => expect(mockPermissions).toHaveBeenCalled());
    await flush();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockGetToken).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("n'envoie pas deux fois le même token pour la même session", async () => {
    const { rerender } = renderHook(() => usePushToken());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    rerender({});
    await flush();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("ne plante pas si l'obtention du token ou l'envoi échoue", async () => {
    mockGetToken.mockRejectedValue(new Error('no projectId'));
    expect(() => renderHook(() => usePushToken())).not.toThrow();
    await waitFor(() => expect(mockGetToken).toHaveBeenCalled());
    await flush();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('renvoie le token pour une nouvelle session après déconnexion', async () => {
    const { rerender } = renderHook(() => usePushToken());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));

    auth({ session: null });
    rerender({});
    await flush();

    auth({ session: { access_token: 'jwt-2', user: { id: 'u2', is_anonymous: false } } });
    rerender({});
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
    expect(mockUpdate).toHaveBeenLastCalledWith('jwt-2', 'ExponentPushToken[abc]');
  });

  it('ne renvoie pas le token quand le JWT est renouvelé pour le même utilisateur', async () => {
    const { rerender } = renderHook(() => usePushToken());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));

    auth({ session: { access_token: 'jwt-refreshed', user: { id: 'u1', is_anonymous: false } } });
    rerender({});
    await flush();

    expect(mockPermissions).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("renvoie le token quand l'utilisateur change sans passer par une déconnexion", async () => {
    const { rerender } = renderHook(() => usePushToken());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));

    auth({ session: { access_token: 'jwt-b', user: { id: 'u2', is_anonymous: false } } });
    rerender({});

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
    expect(mockUpdate).toHaveBeenLastCalledWith('jwt-b', 'ExponentPushToken[abc]');
  });

  it("réessaie après un échec d'envoi (la clé n'est pas mémorisée)", async () => {
    mockUpdate.mockRejectedValueOnce(new Error('network down'));
    const { rerender } = renderHook(() => usePushToken());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    await flush();

    auth({ session: null });
    rerender({});
    await flush();
    auth();
    rerender({});

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
  });
});
