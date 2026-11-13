/**
 * terrainWatch — état local de la validation terrain (story 5.3), dans AsyncStorage
 * (données non sensibles).
 *
 * - préférence : copie locale de `notif_terrain` (vraie valeur = serveur)
 * - ouverture en attente : slug à ouvrir dans le sheet après un tap sur une notification
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Anciennes clés (géorepérage retiré) : purgées par clearTerrainState sur les installs existantes.
const LEGACY_KEYS = ['terrainWatchedPeaks', 'terrainNotifiedAt'];
const PREF_KEY = 'terrainNotifPref';
const PENDING_OPEN_KEY = 'pendingTerrainOpenSlug';

export const PENDING_OPEN_TTL_MS = 10 * 60 * 1000;

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
    // best-effort : l'état terrain n'est jamais critique
  }
}

export async function getTerrainPref(): Promise<boolean> {
  return (await readJson<boolean>(PREF_KEY, true)) !== false;
}

export async function setTerrainPref(enabled: boolean): Promise<void> {
  await writeJson(PREF_KEY, enabled);
}

export async function setPendingTerrainOpen(slug: string, now: number = Date.now()): Promise<void> {
  await writeJson(PENDING_OPEN_KEY, { slug, at: now });
}

/**
 * Retourne true (et efface la demande) si une ouverture est en attente pour ce slug et encore
 * valide (TTL 10 min : si le sommet n'a pas pu être chargé, la demande ne doit pas rouvrir le
 * sheet des jours plus tard). Une demande expirée est effacée sans être honorée.
 */
export async function consumePendingTerrainOpen(
  slug: string,
  now: number = Date.now(),
): Promise<boolean> {
  const pending = await readJson<{ slug?: string; at?: number } | null>(PENDING_OPEN_KEY, null);
  if (pending?.slug !== slug) return false;
  try {
    await AsyncStorage.removeItem(PENDING_OPEN_KEY);
  } catch {
    // best-effort
  }
  return typeof pending.at === 'number' && now - pending.at <= PENDING_OPEN_TTL_MS;
}

/** Efface tout l'état terrain local (déconnexion, suppression de compte). Best-effort. */
export async function clearTerrainState(): Promise<void> {
  try {
    await Promise.all(
      [...LEGACY_KEYS, PREF_KEY, PENDING_OPEN_KEY].map((key) =>
        AsyncStorage.removeItem(key),
      ),
    );
  } catch {
    // best-effort
  }
}
