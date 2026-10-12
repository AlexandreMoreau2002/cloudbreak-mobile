import * as Notifications from 'expo-notifications';
import { Alert, AppState, Linking } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useNotificationPermissionStatus } from '@/hooks/useNotificationPermissionStatus';

jest.mock('@/constants/devConfig', () => ({ DEBUG: false }));
jest.mock('@/utils/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

const mockGet = Notifications.getPermissionsAsync as jest.Mock;
const mockRequest = Notifications.requestPermissionsAsync as jest.Mock;

let appStateListener: ((status: string) => void) | undefined;
const mockRemove = jest.fn();

describe('useNotificationPermissionStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appStateListener = undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, cb: (s: string) => void) => {
      appStateListener = cb;
      return { remove: mockRemove };
    }) as never);
    jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('denied vaut true quand la permission est refusée', async () => {
    mockGet.mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() => useNotificationPermissionStatus());
    await waitFor(() => expect(result.current.denied).toBe(true));
  });

  it.each(['granted', 'undetermined'])('denied vaut false quand le statut est %s', async (status) => {
    mockGet.mockResolvedValue({ status });
    const { result } = renderHook(() => useNotificationPermissionStatus());
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(result.current.denied).toBe(false);
  });

  it('denied vaut false si la lecture échoue', async () => {
    mockGet.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useNotificationPermissionStatus());
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(result.current.denied).toBe(false);
  });

  it('relit le statut au retour au premier plan', async () => {
    mockGet.mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() => useNotificationPermissionStatus());
    await waitFor(() => expect(result.current.denied).toBe(true));

    mockGet.mockResolvedValue({ status: 'granted' });
    await act(async () => {
      appStateListener?.('active');
    });
    await waitFor(() => expect(result.current.denied).toBe(false));
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('ne relit pas le statut quand l’app passe en arrière-plan', async () => {
    mockGet.mockResolvedValue({ status: 'denied' });
    renderHook(() => useNotificationPermissionStatus());
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    await act(async () => {
      appStateListener?.('background');
    });
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('retire l’écouteur AppState au démontage', async () => {
    mockGet.mockResolvedValue({ status: 'denied' });
    const { unmount } = renderHook(() => useNotificationPermissionStatus());
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    unmount();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('openSettings ouvre les réglages iOS sans afficher d’alerte', async () => {
    mockGet.mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() => useNotificationPermissionStatus());
    await waitFor(() => expect(result.current.denied).toBe(true));

    await act(async () => {
      await result.current.openSettings();
    });

    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('openSettings affiche une alerte spécifique aux notifications en cas d’échec', async () => {
    mockGet.mockResolvedValue({ status: 'denied' });
    (Linking.openSettings as jest.Mock).mockRejectedValueOnce(new Error('nope'));
    const { result } = renderHook(() => useNotificationPermissionStatus());
    await waitFor(() => expect(result.current.denied).toBe(true));

    await act(async () => {
      await result.current.openSettings();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'notifications.settingsErrorTitle',
      'notifications.settingsErrorMessage',
    );
  });

  it('ne demande jamais la permission', async () => {
    mockGet.mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() => useNotificationPermissionStatus());
    await waitFor(() => expect(result.current.denied).toBe(true));
    await act(async () => {
      appStateListener?.('active');
    });
    expect(mockRequest).not.toHaveBeenCalled();
  });
});
