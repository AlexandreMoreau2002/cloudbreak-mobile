import * as Location from 'expo-location';
import { useAuth } from '@/contexts/AuthContext';
import { act, renderHook } from '@testing-library/react-native';
import { useLocationPermission } from '@/hooks/onboarding/useLocationPermission';

jest.mock('@/constants/devConfig', () => ({
  DEBUG: false,
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockRequestForegroundPermissionsAsync = Location.requestForegroundPermissionsAsync as jest.Mock;

describe('useLocationPermission', () => {
  const setLocationPermission = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ setLocationPermission });
  });

  it('resolves true and stores granted when the user allows', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    const { result } = renderHook(() => useLocationPermission());

    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.requestPermission();
    });

    expect(granted).toBe(true);
    expect(setLocationPermission).toHaveBeenCalledWith('granted');
  });

  it('resolves false and stores denied when the user denies', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    const { result } = renderHook(() => useLocationPermission());

    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.requestPermission();
    });

    expect(granted).toBe(false);
    expect(setLocationPermission).toHaveBeenCalledWith('denied');
  });

  it('resolves false and stores denied (never throws) when the native call rejects', async () => {
    mockRequestForegroundPermissionsAsync.mockRejectedValueOnce(new Error('native error'));
    const { result } = renderHook(() => useLocationPermission());

    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.requestPermission();
    });

    expect(granted).toBe(false);
    expect(setLocationPermission).toHaveBeenCalledWith('denied');
  });
});
