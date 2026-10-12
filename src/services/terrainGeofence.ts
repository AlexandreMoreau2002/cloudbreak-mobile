/**
 * terrainGeofence — notification terrain en arrière-plan (story 5.3).
 *
 * Mode hybride : le geofencing iOS n'est démarré que si l'utilisateur a DÉJÀ accordé la
 * localisation « Toujours » (réglages iOS). On ne la demande jamais. Sans elle, seul le mode
 * premier plan (useTerrainAutoDetect) fonctionne. Rien ici ne lève : la notification terrain
 * n'est jamais critique.
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

import i18n from '@/utils/i18n';
import { DEBUG } from '@/constants/devConfig';
import {
  canNotify,
  getTerrainPref,
  getWatchedPeaks,
  markNotified,
  type WatchedPeak,
} from '@/utils/terrainWatch';

export const TERRAIN_GEOFENCE_TASK = 'terrain-geofence';
export const NEAR_RADIUS_METERS = 500;

type GeofenceBody = TaskManager.TaskManagerTaskBody<{
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}>;

export async function handleGeofenceEvent({ data, error }: GeofenceBody): Promise<void> {
  if (error || !data || data.eventType !== Location.GeofencingEventType.Enter) return;
  try {
    if (!(await getTerrainPref())) return;
    const peak = (await getWatchedPeaks()).find((p) => p.id === data.region.identifier);
    if (!peak || !(await canNotify(peak.id))) return;
    await markNotified(peak.id);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('terrain.notificationTitle', { peak: peak.name }),
        body: i18n.t('terrain.notificationBody'),
        data: { type: 'terrain', slug: peak.slug },
      },
      trigger: null,
    });
  } catch {
    // permission de notification refusée, stockage indisponible : on abandonne en silence
  }
}

export function defineTerrainGeofenceTask(): void {
  TaskManager.defineTask(TERRAIN_GEOFENCE_TASK, handleGeofenceEvent);
}

export function buildRegions(peaks: WatchedPeak[]): Location.LocationRegion[] {
  return peaks.map((p) => ({
    identifier: p.id,
    latitude: p.lat,
    longitude: p.lng,
    radius: NEAR_RADIUS_METERS,
    notifyOnEnter: true,
    notifyOnExit: false,
  }));
}

/** Aligne le geofencing sur la préférence, la permission « Toujours » et les sommets surveillés. */
export async function syncTerrainGeofences(enabled: boolean): Promise<void> {
  try {
    const started = await Location.hasStartedGeofencingAsync(TERRAIN_GEOFENCE_TASK);
    const { status } = await Location.getBackgroundPermissionsAsync();
    const peaks = enabled && status === 'granted' ? await getWatchedPeaks() : [];
    if (peaks.length === 0) {
      if (started) await Location.stopGeofencingAsync(TERRAIN_GEOFENCE_TASK);
      return;
    }
    await Location.startGeofencingAsync(TERRAIN_GEOFENCE_TASK, buildRegions(peaks));
  } catch (error) {
    // simulateur sans geofencing, permission retirée entre-temps : ignoré (log DEBUG seulement)
    if (DEBUG) {
      console.debug('[terrainGeofence] sync failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
