import { renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { useAuth } from '@/contexts/AuthContext';
import { usePushToken } from '@/hooks/usePushToken';
import { updatePushToken } from '@/services/api/user';

jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/services/api/user', () => ({ updatePushToken: jest.fn() }));

const mockUseAuth = useAuth as jest.Mock;
const mockUpdate = updatePushToken as jest.Mock;
const mockPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockGetToken = Notifications.getExpoPushTokenAsync as jest.Mock;

function auth(overrides: object = {}) {
  mockUseAuth.mockReturnValue({
    session: { access_token: 'jwt', user: { is_anonymous: false } },
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
    await new Promise((r) => setTimeout(r, 0));
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("n'envoie rien sans session", async () => {
    auth({ session: null });
    renderHook(() => usePushToken());
    await new Promise((r) => setTimeout(r, 0));
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('ne demande pas la permission et ne fait rien si elle est refusée', async () => {
    mockPermissions.mockResolvedValue({ status: 'denied' });
    renderHook(() => usePushToken());
    await new Promise((r) => setTimeout(r, 0));
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockGetToken).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("n'envoie pas deux fois le même token pour la même session", async () => {
    const { rerender } = renderHook(() => usePushToken());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    rerender({});
    await new Promise((r) => setTimeout(r, 0));
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("ne plante pas si l'obtention du token ou l'envoi échoue", async () => {
    mockGetToken.mockRejectedValue(new Error('no projectId'));
    expect(() => renderHook(() => usePushToken())).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
