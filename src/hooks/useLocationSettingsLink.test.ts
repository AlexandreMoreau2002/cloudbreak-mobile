import { Alert, Linking } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { useLocationSettingsLink } from '@/hooks/useLocationSettingsLink';

jest.mock('@/constants/devConfig', () => ({ DEBUG: false }));
jest.mock('@/services/analytics', () => ({ track: jest.fn() }));
jest.mock('@/utils/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

describe('useLocationSettingsLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens iOS settings and tracks the event on success', async () => {
    const { track } = jest.requireMock('@/services/analytics');
    (Linking.openSettings as jest.Mock).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useLocationSettingsLink());

    await result.current.openLocationSettings();

    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('location_settings_opened');
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('shows an alert when openSettings fails, without throwing', async () => {
    (Linking.openSettings as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const { result } = renderHook(() => useLocationSettingsLink());

    await expect(result.current.openLocationSettings()).resolves.toBeUndefined();

    expect(Alert.alert).toHaveBeenCalledWith('profile.locationSettingsErrorTitle', 'profile.locationSettingsErrorMessage');
  });
});
