/**
 * useNotificationPreferences — charge et bascule les 3 préférences de notification.
 *
 * Update optimiste : le toggle change l'état local immédiatement, puis appelle le PATCH ;
 * en cas d'échec, l'état local revient à sa valeur précédente (pas de message d'erreur
 * bloquant, cohérent avec l'exigence de sauvegarde immédiate de la story 2.2).
 *
 * Usage :
 *   const { state, toggle } = useNotificationPreferences();
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEBUG } from '@/constants/devConfig';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMe, updateNotificationPreferences } from '@/services/api/user';
import type { AsyncState, NotificationPreferences } from '@/services/mockData/types';

type PrefKey = keyof NotificationPreferences;

const CACHE_VERSION = 'v1';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;

interface NotificationPreferencesCachePayload {
  data: NotificationPreferences;
  cachedAt: number;
}

function notificationPreferencesCacheKey(userId: string): string {
  return `cache:notification-preferences:${CACHE_VERSION}:${userId}`;
}

async function readCache(userId: string): Promise<NotificationPreferences | null> {
  try {
    const raw = await AsyncStorage.getItem(notificationPreferencesCacheKey(userId));
    if (!raw) return null;
    const cached = JSON.parse(raw) as NotificationPreferencesCachePayload;
    return Date.now() - cached.cachedAt < CACHE_TTL_MS ? cached.data : null;
  } catch {
    return null;
  }
}

async function writeCache(userId: string, data: NotificationPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(
      notificationPreferencesCacheKey(userId),
      JSON.stringify({ data, cachedAt: Date.now() } satisfies NotificationPreferencesCachePayload),
    );
  } catch {
    // Cache write failure — non-fatal
  }
}

export function useNotificationPreferences() {
  const { session, isAnonymous } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;
  const anonymous = isAnonymous || session?.user?.is_anonymous === true;
  const [state, setState] = useState<AsyncState<NotificationPreferences>>({ status: 'idle' });

  const load = useCallback(async () => {
    if (anonymous || !token) {
      setState({ status: 'idle' });
      return;
    }
    if (DEBUG) console.debug('[useNotificationPreferences] load');
    setState({ status: 'loading' });
    try {
      const cached = userId ? await readCache(userId) : null;
      if (cached) {
        setState({ status: 'success', data: cached });
        return;
      }
      const me = await fetchMe(token);
      const data = {
        notif_favorites: me.notif_favorites ?? true,
        notif_regional: me.notif_regional ?? true,
        notif_terrain: me.notif_terrain ?? true,
      };
      setState({ status: 'success', data });
      if (userId) await writeCache(userId, data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      if (DEBUG) console.debug('[useNotificationPreferences] load error', { message });
      setState({ status: 'error', error: message });
    }
  }, [anonymous, token, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback(
    async (key: PrefKey) => {
      if (state.status !== 'success' || !state.data || !token) return;
      const previous = state.data;
      const next = { ...previous, [key]: !previous[key] };
      if (DEBUG) console.debug('[useNotificationPreferences] toggle', { key, value: next[key] });
      setState({ status: 'success', data: next });
      if (userId) await writeCache(userId, next);
      try {
        await updateNotificationPreferences(token, { [key]: next[key] });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        if (DEBUG) console.debug('[useNotificationPreferences] toggle error', { message });
        setState({ status: 'success', data: previous });
        if (userId) await writeCache(userId, previous);
      }
    },
    [state, token, userId],
  );

  return { state, toggle, refresh: load };
}
