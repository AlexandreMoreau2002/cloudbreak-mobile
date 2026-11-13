import * as Notifications from 'expo-notifications';
import { act, renderHook } from '@testing-library/react-native';
import { useNotificationPermission } from '@/hooks/onboarding/useNotificationPermission';

jest.mock('@/constants/devConfig', () => ({
  DEBUG: false,
}));

const mockRequestPermissionsAsync = Notifications.requestPermissionsAsync as jest.Mock;

describe('useNotificationPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves true when the user grants the permission', async () => {
    mockRequestPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    const { result } = renderHook(() => useNotificationPermission());

    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.requestPermission();
    });

    expect(granted).toBe(true);
  });

  it('resolves false when the user denies the permission', async () => {
    mockRequestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    const { result } = renderHook(() => useNotificationPermission());

    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.requestPermission();
    });

    expect(granted).toBe(false);
  });

  it('resolves false (never throws) when the native call rejects', async () => {
    mockRequestPermissionsAsync.mockRejectedValueOnce(new Error('native error'));
    const { result } = renderHook(() => useNotificationPermission());

    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.requestPermission();
    });

    expect(granted).toBe(false);
  });
});
