import * as Location from 'expo-location';
import { renderHook } from '@testing-library/react-native';
import { useTerrainAutoDetect, haversineDistanceMeters } from '@/hooks/useTerrainAutoDetect';

const mockDevConfigState = { DEBUG: false };

jest.mock('expo-location', () => ({
  watchPositionAsync: jest.fn(),
}));

jest.mock('@/constants/devConfig', () => ({
  get DEBUG() { return mockDevConfigState.DEBUG; },
}));

const mockWatchPosition = Location.watchPositionAsync as jest.Mock;

describe('useTerrainAutoDetect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDevConfigState.DEBUG = false;
    mockWatchPosition.mockResolvedValue({ remove: jest.fn() });
  });

  it('ne surveille pas la position si permission non accordée', () => {
    renderHook(() =>
      useTerrainAutoDetect({
        locationPermission: 'denied',
        target: { lat: 45.83, lng: 6.86 },
        onNear: jest.fn(),
      }),
    );
    expect(mockWatchPosition).not.toHaveBeenCalled();
  });

  it('ne surveille pas la position si aucune cible (pas de sommet consulté)', () => {
    renderHook(() =>
      useTerrainAutoDetect({ locationPermission: 'granted', target: null, onNear: jest.fn() }),
    );
    expect(mockWatchPosition).not.toHaveBeenCalled();
  });

  it('surveille la position avec les bons paramètres si permission + cible', () => {
    renderHook(() =>
      useTerrainAutoDetect({
        locationPermission: 'granted',
        target: { lat: 45.83, lng: 6.86 },
        onNear: jest.fn(),
      }),
    );
    expect(mockWatchPosition).toHaveBeenCalledWith(
      expect.objectContaining({ distanceInterval: 50, timeInterval: 30000 }),
      expect.any(Function),
    );
  });

  it('appelle onNear quand la position est à moins de 500m de la cible', async () => {
    const onNear = jest.fn();
    let callback: ((pos: unknown) => void) | undefined;
    mockWatchPosition.mockImplementationOnce((_opts, cb) => {
      callback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });

    renderHook(() =>
      useTerrainAutoDetect({
        locationPermission: 'granted',
        target: { lat: 45.83, lng: 6.86 },
        onNear,
      }),
    );

    await Promise.resolve();
    callback?.({ coords: { latitude: 45.831, longitude: 6.861 } });
    expect(onNear).toHaveBeenCalled();
  });

  it("n'appelle pas onNear si la position est loin de la cible", async () => {
    const onNear = jest.fn();
    let callback: ((pos: unknown) => void) | undefined;
    mockWatchPosition.mockImplementationOnce((_opts, cb) => {
      callback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });

    renderHook(() =>
      useTerrainAutoDetect({
        locationPermission: 'granted',
        target: { lat: 45.83, lng: 6.86 },
        onNear,
      }),
    );

    await Promise.resolve();
    callback?.({ coords: { latitude: 46.5, longitude: 7.5 } });
    expect(onNear).not.toHaveBeenCalled();
  });

  it('log la distance en mode DEBUG quand la position est reçue', async () => {
    mockDevConfigState.DEBUG = true;
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    const onNear = jest.fn();
    let callback: ((pos: unknown) => void) | undefined;
    mockWatchPosition.mockImplementationOnce((_opts, cb) => {
      callback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });

    renderHook(() =>
      useTerrainAutoDetect({
        locationPermission: 'granted',
        target: { lat: 45.83, lng: 6.86 },
        onNear,
      }),
    );

    await Promise.resolve();
    callback?.({ coords: { latitude: 45.831, longitude: 6.861 } });

    expect(debugSpy).toHaveBeenCalledWith(
      '[useTerrainAutoDetect] distance',
      expect.objectContaining({ distance: expect.any(Number) }),
    );
    debugSpy.mockRestore();
  });

  it("n'appelle onNear qu'une seule fois même si la callback est déclenchée plusieurs fois", async () => {
    const onNear = jest.fn();
    let callback: ((pos: unknown) => void) | undefined;
    mockWatchPosition.mockImplementationOnce((_opts, cb) => {
      callback = cb;
      return Promise.resolve({ remove: jest.fn() });
    });

    renderHook(() =>
      useTerrainAutoDetect({
        locationPermission: 'granted',
        target: { lat: 45.83, lng: 6.86 },
        onNear,
      }),
    );

    await Promise.resolve();
    callback?.({ coords: { latitude: 45.831, longitude: 6.861 } });
    callback?.({ coords: { latitude: 45.831, longitude: 6.861 } });
    expect(onNear).toHaveBeenCalledTimes(1);
  });

  it('haversineDistanceMeters retourne 0 pour deux points identiques', () => {
    expect(haversineDistanceMeters({ lat: 45.83, lng: 6.86 }, { lat: 45.83, lng: 6.86 })).toBe(0);
  });

  it('nettoie la souscription si le composant est démonté avant la résolution de watchPositionAsync', async () => {
    const removeMock = jest.fn();
    let resolveWatch: (sub: { remove: () => void }) => void = () => {};
    mockWatchPosition.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveWatch = resolve;
        }),
    );

    const { unmount } = renderHook(() =>
      useTerrainAutoDetect({
        locationPermission: 'granted',
        target: { lat: 45.83, lng: 6.86 },
        onNear: jest.fn(),
      }),
    );

    unmount();
    resolveWatch({ remove: removeMock });
    await Promise.resolve();

    expect(removeMock).toHaveBeenCalled();
  });
});
