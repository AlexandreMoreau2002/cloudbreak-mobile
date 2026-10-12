import * as TaskManager from 'expo-task-manager';

import { TERRAIN_GEOFENCE_TASK } from '@/services/terrainGeofence';

jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-notifications', () => ({ scheduleNotificationAsync: jest.fn() }));
jest.mock('expo-location', () => ({ GeofencingEventType: { Enter: 1, Exit: 2 } }));
jest.mock('@/utils/terrainWatch', () => ({}));

it("enregistre la tâche de geofencing dès l'import du module", () => {
  jest.isolateModules(() => {
    require('@/services/terrainGeofenceTask');
  });
  expect(TaskManager.defineTask).toHaveBeenCalledWith(TERRAIN_GEOFENCE_TASK, expect.any(Function));
});
