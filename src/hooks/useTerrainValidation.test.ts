import * as Location from 'expo-location';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { postTerrainValidation } from '@/services/api/validations';
import { useTerrainValidation } from '@/hooks/useTerrainValidation';

jest.mock('expo-location', () => ({
  getCurrentPositionAsync: jest.fn(),
}));
jest.mock('@/services/api/validations', () => ({
  postTerrainValidation: jest.fn(),
}));

const mockGetCurrentPosition = Location.getCurrentPositionAsync as jest.Mock;
const mockPostValidation = postTerrainValidation as jest.Mock;

describe('useTerrainValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('démarre à step null (fermé)', () => {
    const { result } = renderHook(() =>
      useTerrainValidation({ token: 'tok', locationPermission: 'granted' }),
    );
    expect(result.current.step).toBeNull();
  });

  it('open() passe par searching puis ready avec position obtenue', async () => {
    mockGetCurrentPosition.mockResolvedValueOnce({
      coords: { latitude: 45.83, longitude: 6.86 },
    });
    const { result } = renderHook(() =>
      useTerrainValidation({ token: 'tok', locationPermission: 'granted' }),
    );

    act(() => {
      result.current.open();
    });
    expect(result.current.step).toBe('searching');

    await waitFor(() => expect(result.current.step).toBe('ready'));
    expect(result.current.noGps).toBe(false);
  });

  it('permission refusée -> step denied', async () => {
    const { result } = renderHook(() =>
      useTerrainValidation({ token: 'tok', locationPermission: 'denied' }),
    );

    act(() => {
      result.current.open();
    });

    await waitFor(() => expect(result.current.step).toBe('denied'));
    expect(mockGetCurrentPosition).not.toHaveBeenCalled();
  });

  it('validateManually depuis denied repasse en ready avec noGps=true', async () => {
    const { result } = renderHook(() =>
      useTerrainValidation({ token: 'tok', locationPermission: 'denied' }),
    );

    act(() => result.current.open());
    await waitFor(() => expect(result.current.step).toBe('denied'));

    act(() => result.current.validateManually());
    expect(result.current.step).toBe('ready');
    expect(result.current.noGps).toBe(true);
  });

  it('answer(true) appelle postTerrainValidation et passe à success', async () => {
    mockGetCurrentPosition.mockResolvedValueOnce({
      coords: { latitude: 45.83, longitude: 6.86 },
    });
    mockPostValidation.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() =>
      useTerrainValidation({ token: 'tok', locationPermission: 'granted' }),
    );

    act(() => result.current.open());
    await waitFor(() => expect(result.current.step).toBe('ready'));

    await act(async () => {
      await result.current.answer(true, { predictionId: 'pred-1' });
    });

    expect(mockPostValidation).toHaveBeenCalledWith('tok', {
      prediction_id: 'pred-1',
      result: 'confirmed',
      lat: 45.83,
      lng: 6.86,
    });
    expect(result.current.step).toBe('success');
  });

  it('answer(false) sans position (noGps) envoie lat/lng undefined', async () => {
    mockPostValidation.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() =>
      useTerrainValidation({ token: 'tok', locationPermission: 'denied' }),
    );

    act(() => result.current.open());
    await waitFor(() => expect(result.current.step).toBe('denied'));
    act(() => result.current.validateManually());

    await act(async () => {
      await result.current.answer(false, { predictionId: 'pred-2' });
    });

    expect(mockPostValidation).toHaveBeenCalledWith('tok', {
      prediction_id: 'pred-2',
      result: 'denied',
      lat: undefined,
      lng: undefined,
    });
    expect(result.current.step).toBe('success');
  });

  it('dismiss() referme la modal (step null)', () => {
    mockGetCurrentPosition.mockResolvedValueOnce({
      coords: { latitude: 45.83, longitude: 6.86 },
    });
    const { result } = renderHook(() =>
      useTerrainValidation({ token: 'tok', locationPermission: 'granted' }),
    );
    act(() => result.current.open());
    act(() => result.current.dismiss());
    expect(result.current.step).toBeNull();
  });

  it('open() sans token appelle quand même getCurrentPositionAsync', async () => {
    mockGetCurrentPosition.mockResolvedValueOnce({
      coords: { latitude: 1, longitude: 2 },
    });
    const { result } = renderHook(() =>
      useTerrainValidation({ token: null, locationPermission: 'granted' }),
    );

    act(() => result.current.open());
    await waitFor(() => expect(result.current.step).toBe('ready'));

    await act(async () => {
      await result.current.answer(true, { predictionId: 'pred-3' });
    });

    expect(mockPostValidation).not.toHaveBeenCalled();
  });

  it('open() -> getCurrentPositionAsync rejette -> step denied', async () => {
    mockGetCurrentPosition.mockRejectedValueOnce(new Error('gps off'));
    const { result } = renderHook(() =>
      useTerrainValidation({ token: 'tok', locationPermission: 'granted' }),
    );

    act(() => result.current.open());
    await waitFor(() => expect(result.current.step).toBe('denied'));
  });
});
