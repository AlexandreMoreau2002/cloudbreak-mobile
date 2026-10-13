import * as Notifications from 'expo-notifications';
import { AppState, type AppStateStatus } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePushToken } from '@/hooks/usePushToken';
import { updatePushToken } from '@/services/api/user';

jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: jest.fn() }));
jest.mock('@/services/api/user', () => ({ updatePushToken: jest.fn() }));

const mockUseAuth = useAuth as jest.Mock;
const mockUseLanguage = useLanguage as jest.Mock;
const mockUpdate = updatePushToken as jest.Mock;
const mockPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockGetToken = Notifications.getExpoPushTokenAsync as jest.Mock;

let appStateListeners: ((status: AppStateStatus) => void)[] = [];
const remove = jest.fn();

const flush = () => act(async () => {});
const becomeActive = () =>
  act(async () => {
    appStateListeners.forEach((listener) => listener('active'));
  });

function auth(overrides: object = {}) {
  mockUseAuth.mockReturnValue({
    session: { access_token: 'jwt', user: { id: 'u1', is_anonymous: false } },
    isAnonymous: false,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  appStateListeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _type: string,
    listener: (status: AppStateStatus) => void,
  ) => {
    appStateListeners.push(listener);
    return { remove };
  }) as never);
  mockPermissions.mockResolvedValue({ status: 'granted' });
  mockGetToken.mockResolvedValue({ data: 'ExponentPushToken[abc]' });
  mockUpdate.mockResolvedValue(undefined);
  mockUseLanguage.mockReturnValue({ locale: 'fr' });
  auth();
});

describe('usePushToken', () => {
  it('envoie le token au backend quand la permission est accordée', async () => {
    renderHook(() => usePushToken());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('jwt', 'ExponentPushToken[abc]', 'fr'));
  });

  it("n'envoie rien pour un compte anonyme", async () => {
    auth({ isAnonymous: true });
    renderHook(() => usePushToken());
    await flush();
    await becomeActive();
    expect(mockPermissions).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("n'envoie rien sans session", async () => {
    auth({ session: null });
    renderHook(() => usePushToken());
    await flush();
    await becomeActive();
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

  it("ne plante pas si l'obtention du token échoue", async () => {
    mockGetToken.mockRejectedValue(new Error('no projectId'));
    expect(() => renderHook(() => usePushToken())).not.toThrow();
    await waitFor(() => expect(mockGetToken).toHaveBeenCalled());
    await flush();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("ne renvoie pas le token quand l'app redevient active sans changement", async () => {
    renderHook(() => usePushToken());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));

    await becomeActive();
    await flush();

    expect(mockGetToken).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('un seul envoi malgré deux retours actifs rapprochés', async () => {
    let release: () => void = () => {};
    mockUpdate.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
    renderHook(() => usePushToken());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));

    await becomeActive();
    await becomeActive();
    release();
    await flush();

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('envoie le token quand la permission passe de undetermined à granted puis app active', async () => {
    mockPermissions.mockResolvedValue({ status: 'undetermined' });
    renderHook(() => usePushToken());
    await waitFor(() => expect(mockPermissions).toHaveBeenCalledTimes(1));
    await flush();
    expect(mockUpdate).not.toHaveBeenCalled();

    mockPermissions.mockResolvedValue({ status: 'granted' });
    await becomeActive();

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('jwt', 'ExponentPushToken[abc]', 'fr'));
  });

  it("réessaie au retour actif après un échec réseau, sans mémoriser l'échec", async () => {
    mockUpdate.mockRejectedValueOnce(new Error('network down'));
    renderHook(() => usePushToken());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    await flush();

    await becomeActive();

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
  });

  it('retire le listener AppState au démontage', async () => {
    const { unmount } = renderHook(() => usePushToken());
    await flush();
    unmount();
    expect(remove).toHaveBeenCalled();
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
    expect(mockUpdate).toHaveBeenLastCalledWith('jwt-2', 'ExponentPushToken[abc]', 'fr');
  });

  it('renvoie le token quand le même utilisateur se reconnecte après une déconnexion', async () => {
    const { rerender } = renderHook(() => usePushToken());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));

    auth({ session: null });
    rerender({});
    await flush();
    auth();
    rerender({});

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
  });

  it('ne renvoie pas le token quand le JWT est renouvelé pour le même utilisateur', async () => {
    const { rerender } = renderHook(() => usePushToken());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));

    auth({ session: { access_token: 'jwt-refreshed', user: { id: 'u1', is_anonymous: false } } });
    rerender({});
    await flush();

    // L'effet n'a pas été relancé (une seule lecture de permission) et rien n'est renvoyé.
    expect(mockPermissions).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    // Le JWT renouvelé est bien celui utilisé pour un envoi ultérieur.
    mockUpdate.mockClear();
    mockGetToken.mockResolvedValue({ data: 'ExponentPushToken[new]' });
    await becomeActive();
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('jwt-refreshed', 'ExponentPushToken[new]', 'fr'));
  });

  it("renvoie le token quand l'utilisateur change sans passer par une déconnexion", async () => {
    const { rerender } = renderHook(() => usePushToken());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));

    auth({ session: { access_token: 'jwt-b', user: { id: 'u2', is_anonymous: false } } });
    rerender({});

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
    expect(mockUpdate).toHaveBeenLastCalledWith('jwt-b', 'ExponentPushToken[abc]', 'fr');
  });

  it('envoie le token quand un invité devient permanent avec le même userId', async () => {
    auth({ isAnonymous: true, session: { access_token: 'guest', user: { id: 'u1', is_anonymous: true } } });
    const { rerender } = renderHook(() => usePushToken());
    await flush();
    expect(mockUpdate).not.toHaveBeenCalled();

    auth({ isAnonymous: false, session: { access_token: 'perm', user: { id: 'u1', is_anonymous: false } } });
    rerender({});

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('perm', 'ExponentPushToken[abc]', 'fr'));
  });

  it("envoie la langue de l'app avec le token", async () => {
    mockUseLanguage.mockReturnValue({ locale: 'en' });
    renderHook(() => usePushToken());
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('jwt', 'ExponentPushToken[abc]', 'en'),
    );
  });

  it('renvoie le token avec la nouvelle langue quand la langue change', async () => {
    const { rerender } = renderHook(() => usePushToken());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));

    mockUseLanguage.mockReturnValue({ locale: 'en' });
    rerender({});

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
    expect(mockUpdate).toHaveBeenLastCalledWith('jwt', 'ExponentPushToken[abc]', 'en');
  });

  it('ne renvoie rien au retour actif quand la langue est inchangée après un changement', async () => {
    const { rerender } = renderHook(() => usePushToken());
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    mockUseLanguage.mockReturnValue({ locale: 'en' });
    rerender({});
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));

    await becomeActive();
    await flush();

    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it('normalise une langue inattendue vers fr', async () => {
    mockUseLanguage.mockReturnValue({ locale: 'de' });
    renderHook(() => usePushToken());
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('jwt', 'ExponentPushToken[abc]', 'fr'),
    );
  });
});
