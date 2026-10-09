/**
 * terrainWatch — état local de la notification terrain (story 5.3), dans AsyncStorage
 * (données non sensibles) car la tâche de fond du geofencing ne peut pas appeler l'API.
 *
 * - sommets surveillés : les derniers sommets consultés (max 3, 48 h)
 * - cooldown : une notification par sommet toutes les 12 h
 * - préférence : copie locale de `notif_terrain` (vraie valeur = serveur)
 * - ouverture en attente : slug à ouvrir dans le sheet après un tap sur la notification
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Peak } from '@/services/mockData/types';

const WATCHED_KEY = 'terrainWatchedPeaks';
const NOTIFIED_KEY = 'terrainNotifiedAt';
const PREF_KEY = 'terrainNotifPref';
const PENDING_OPEN_KEY = 'pendingTerrainOpenSlug';

export const MAX_WATCHED = 3;
export const WATCH_TTL_MS = 48 * 60 * 60 * 1000;
export const NOTIFY_COOLDOWN_MS = 12 * 60 * 60 * 1000;

export interface WatchedPeak {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  consultedAt: number;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort : la notification terrain n'est jamais critique
  }
}

export async function getWatchedPeaks(now: number = Date.now()): Promise<WatchedPeak[]> {
  const peaks = await readJson<WatchedPeak[]>(WATCHED_KEY, []);
  return peaks.filter((p) => now - p.consultedAt <= WATCH_TTL_MS);
}

export async function rememberWatchedPeak(peak: Peak, now: number = Date.now()): Promise<void> {
  const others = (await getWatchedPeaks(now)).filter((p) => p.id !== peak.id);
  const entry: WatchedPeak = {
    id: peak.id,
    slug: peak.slug,
    name: peak.name,
    lat: peak.lat,
    lng: peak.lng,
    consultedAt: now,
  };
  await writeJson(WATCHED_KEY, [entry, ...others].slice(0, MAX_WATCHED));
}

export async function canNotify(peakId: string, now: number = Date.now()): Promise<boolean> {
  const notified = await readJson<Record<string, number>>(NOTIFIED_KEY, {});
  const last = notified[peakId];
  return last === undefined || now - last >= NOTIFY_COOLDOWN_MS;
}

export async function markNotified(peakId: string, now: number = Date.now()): Promise<void> {
  const notified = await readJson<Record<string, number>>(NOTIFIED_KEY, {});
  const recent = Object.fromEntries(
    Object.entries(notified).filter(([, at]) => now - at < NOTIFY_COOLDOWN_MS),
  );
  await writeJson(NOTIFIED_KEY, { ...recent, [peakId]: now });
}

export async function getTerrainPref(): Promise<boolean> {
  return (await readJson<boolean>(PREF_KEY, true)) !== false;
}

export async function setTerrainPref(enabled: boolean): Promise<void> {
  await writeJson(PREF_KEY, enabled);
}

export async function setPendingTerrainOpen(slug: string): Promise<void> {
  await writeJson(PENDING_OPEN_KEY, slug);
}

/** Retourne true (et efface la demande) si une ouverture est en attente pour ce slug. */
export async function consumePendingTerrainOpen(slug: string): Promise<boolean> {
  const pending = await readJson<string | null>(PENDING_OPEN_KEY, null);
  if (pending !== slug) return false;
  try {
    await AsyncStorage.removeItem(PENDING_OPEN_KEY);
  } catch {
    // best-effort
  }
  return true;
}

/** Efface tout l'état terrain local (déconnexion, suppression de compte). Best-effort. */
export async function clearTerrainState(): Promise<void> {
  try {
    await Promise.all(
      [WATCHED_KEY, NOTIFIED_KEY, PREF_KEY, PENDING_OPEN_KEY].map((key) =>
        AsyncStorage.removeItem(key),
      ),
    );
  } catch {
    // best-effort
  }
}
