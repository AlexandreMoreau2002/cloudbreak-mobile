import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import {
  buildRegions,
  defineTerrainGeofenceTask,
  handleGeofenceEvent,
  NEAR_RADIUS_METERS,
  syncTerrainGeofences,
  TERRAIN_GEOFENCE_TASK,
} from '@/services/terrainGeofence';
import * as watch from '@/utils/terrainWatch';

jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-notifications', () => ({ scheduleNotificationAsync: jest.fn() }));
jest.mock('expo-location', () => ({
  GeofencingEventType: { Enter: 1, Exit: 2 },
  getBackgroundPermissionsAsync: jest.fn(),
  hasStartedGeofencingAsync: jest.fn(),
  startGeofencingAsync: jest.fn(),
  stopGeofencingAsync: jest.fn(),
}));
jest.mock('@/utils/terrainWatch', () => ({
  canNotify: jest.fn(),
  getTerrainPref: jest.fn(),
  getWatchedPeaks: jest.fn(),
  markNotified: jest.fn(),
}));

const mocked = <T,>(fn: T) => fn as unknown as jest.Mock;
const peak = {
  id: 'p1',
  slug: 'mont-blanc',
  name: 'Mont Blanc',
  lat: 45.83,
  lng: 6.86,
  consultedAt: 1,
};
const enter = { data: { eventType: 1, region: { identifier: 'p1' } }, error: null };

beforeEach(() => {
  jest.clearAllMocks();
  mocked(watch.getTerrainPref).mockResolvedValue(true);
  mocked(watch.getWatchedPeaks).mockResolvedValue([peak]);
  mocked(watch.canNotify).mockResolvedValue(true);
  mocked(Notifications.scheduleNotificationAsync).mockResolvedValue('id');
  mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({ status: 'granted' });
  mocked(Location.hasStartedGeofencingAsync).mockResolvedValue(false);
  mocked(Location.startGeofencingAsync).mockResolvedValue(undefined);
});

describe('handleGeofenceEvent', () => {
  it("programme une notification locale immédiate à l'entrée dans la zone", async () => {
    await handleGeofenceEvent(enter as never);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: expect.objectContaining({ data: { type: 'terrain', slug: 'mont-blanc' } }),
      trigger: null,
    });
    expect(watch.markNotified).toHaveBeenCalledWith('p1');
  });

  it.each([
    ['sortie de zone', { data: { eventType: 2, region: { identifier: 'p1' } }, error: null }],
    ['erreur de la tâche', { data: null, error: new Error('x') }],
  ])('ignore : %s', async (_label, event) => {
    await handleGeofenceEvent(event as never);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('ne notifie pas si la préférence terrain est désactivée', async () => {
    mocked(watch.getTerrainPref).mockResolvedValue(false);
    await handleGeofenceEvent(enter as never);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('ne notifie pas pour un sommet inconnu ou en cooldown', async () => {
    mocked(watch.getWatchedPeaks).mockResolvedValue([]);
    await handleGeofenceEvent(enter as never);
    mocked(watch.getWatchedPeaks).mockResolvedValue([peak]);
    mocked(watch.canNotify).mockResolvedValue(false);
    await handleGeofenceEvent(enter as never);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('ne lève jamais si la notification échoue', async () => {
    mocked(Notifications.scheduleNotificationAsync).mockRejectedValue(new Error('denied'));
    await expect(handleGeofenceEvent(enter as never)).resolves.toBeUndefined();
  });
});

describe('syncTerrainGeofences', () => {
  it('démarre le geofencing avec un rayon de 500 m par sommet si « Toujours » est accordé', async () => {
    await syncTerrainGeofences(true);
    expect(Location.startGeofencingAsync).toHaveBeenCalledWith(TERRAIN_GEOFENCE_TASK, [
      {
        identifier: 'p1',
        latitude: 45.83,
        longitude: 6.86,
        radius: NEAR_RADIUS_METERS,
        notifyOnEnter: true,
        notifyOnExit: false,
      },
    ]);
  });

  it('ne demande JAMAIS la permission et ne démarre rien sans « Toujours »', async () => {
    mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({ status: 'undetermined' });
    await syncTerrainGeofences(true);
    expect(Location.startGeofencingAsync).not.toHaveBeenCalled();
  });

  it('arrête le geofencing déjà démarré quand la préférence est coupée', async () => {
    mocked(Location.hasStartedGeofencingAsync).mockResolvedValue(true);
    await syncTerrainGeofences(false);
    expect(Location.stopGeofencingAsync).toHaveBeenCalledWith(TERRAIN_GEOFENCE_TASK);
    expect(Location.startGeofencingAsync).not.toHaveBeenCalled();
  });

  it('ne lève jamais si expo-location échoue', async () => {
    mocked(Location.startGeofencingAsync).mockRejectedValue(new Error('boom'));
    await expect(syncTerrainGeofences(true)).resolves.toBeUndefined();
  });
});

describe('definition', () => {
  it('enregistre la tâche auprès de TaskManager', () => {
    defineTerrainGeofenceTask();
    expect(TaskManager.defineTask).toHaveBeenCalledWith(TERRAIN_GEOFENCE_TASK, handleGeofenceEvent);
  });

  it('buildRegions mappe les sommets', () => {
    expect(buildRegions([peak])[0]).toMatchObject({ identifier: 'p1', radius: 500 });
  });
});
