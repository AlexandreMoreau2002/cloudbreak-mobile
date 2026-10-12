import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMe, updateNotificationPreferences } from '@/services/api/user';
import { useNotificationPermissionStatus } from '@/hooks/useNotificationPermissionStatus';
import NotificationsScreen from './notifications';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('@/contexts/AuthContext');
jest.mock('@/services/api/user');
jest.mock('@/hooks/useNotificationPermissionStatus');
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/constants/devConfig', () => ({ DEBUG: false, MOCK_API: false }));
jest.mock('@/services/supabaseClient', () => ({ supabase: {} }));
jest.mock('@react-native-async-storage/async-storage', () => ({}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { background: '#fff', surface: '#fff', border: '#ccc', textPrimary: '#111', textSecondary: '#666', accent: '#b28c6e' },
    typography: { fontFamily: { regular: 'System', bold: 'System' }, fontSize: { sm: 14 } },
    spacing: { sm: 8 },
  }),
}));
jest.mock('@/utils/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

const mockBack = jest.fn();
const mockOpenSettings = jest.fn();
const mockPermissionStatus = useNotificationPermissionStatus as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockFetchMe = fetchMe as jest.Mock;
const mockUpdate = updateNotificationPreferences as jest.Mock;

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermissionStatus.mockReturnValue({ denied: false, openSettings: mockOpenSettings });
    (useRouter as jest.Mock).mockReturnValue({ back: mockBack });
    mockUseAuth.mockReturnValue({
      session: { access_token: 'tok' },
      isAnonymous: false,
      locationPermission: 'granted',
    });
    mockFetchMe.mockResolvedValue({
      id: 'u1', is_anonymous: false, provisioned: true,
      notif_favorites: true, notif_regional: false, notif_terrain: true,
    });
  });

  it('affiche les 3 préférences avec leur état chargé', async () => {
    const { getByText } = render(<NotificationsScreen />);
    await waitFor(() => expect(getByText('notifications.favorites')).toBeTruthy());
    expect(getByText('notifications.regional')).toBeTruthy();
    expect(getByText('notifications.terrain')).toBeTruthy();
    expect(getByText('notifications.off')).toBeTruthy();
  });

  it('bascule une préférence au tap et appelle le PATCH', async () => {
    mockUpdate.mockResolvedValue(undefined);
    const { getByText } = render(<NotificationsScreen />);
    await waitFor(() => expect(getByText('notifications.favorites')).toBeTruthy());
    fireEvent.press(getByText('notifications.favorites'));
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('tok', { notif_favorites: false }),
    );
  });

  it('verrouille la ligne GPS et affiche l’indice quand la localisation est refusée', async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: 'tok' },
      isAnonymous: false,
      locationPermission: 'denied',
    });
    const { getByText, queryByText } = render(<NotificationsScreen />);
    await waitFor(() => expect(getByText('notifications.terrain')).toBeTruthy());
    expect(queryByText('notifications.unavailable')).toBeTruthy();
    expect(getByText('notifications.gpsLockedHint')).toBeTruthy();
    fireEvent.press(getByText('notifications.terrain'));
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('revient en arrière au tap sur le chevron retour', async () => {
    const { getAllByText, getByTestId } = render(<NotificationsScreen />);
    await waitFor(() => expect(getAllByText('notifications.on')).toHaveLength(2));
    fireEvent.press(getByTestId('notifications-back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('affiche le bandeau quand la permission iOS est refusée', async () => {
    mockPermissionStatus.mockReturnValue({ denied: true, openSettings: mockOpenSettings });
    const { getByTestId, getByText } = render(<NotificationsScreen />);
    await waitFor(() => expect(getByText('notifications.favorites')).toBeTruthy());
    expect(getByTestId('notification-permission-banner')).toBeTruthy();
  });

  it('masque le bandeau quand la permission n’est pas refusée', async () => {
    const { queryByTestId, getByText } = render(<NotificationsScreen />);
    await waitFor(() => expect(getByText('notifications.favorites')).toBeTruthy());
    expect(queryByTestId('notification-permission-banner')).toBeNull();
  });

  it('ouvre les réglages au tap sur le bouton du bandeau', async () => {
    mockPermissionStatus.mockReturnValue({ denied: true, openSettings: mockOpenSettings });
    const { getByTestId, getByText } = render(<NotificationsScreen />);
    await waitFor(() => expect(getByText('notifications.favorites')).toBeTruthy());
    fireEvent.press(getByTestId('notification-permission-banner-button'));
    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  });
});
