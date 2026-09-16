/**
 * useNotificationPreferences — charge et bascule les 3 préférences de notification.
 *
 * Toujours chargées depuis le backend (`GET /api/v1/user/me`) au montage — pas de cache local :
 * l'AC de la story 2.2 exige que l'état affiché reflète l'état réel côté serveur, ce qui exclut
 * de servir une valeur locale potentiellement périmée (ex. préférence changée depuis un autre
 * device).
 *
 * Update optimiste : le toggle change l'état local immédiatement, puis appelle le PATCH ;
 * en cas d'échec, l'état local revient à sa valeur précédente (pas de message d'erreur
 * bloquant, cohérent avec l'exigence de sauvegarde immédiate de la story 2.2).
 *
 * Usage :
 *   const { state, toggle } = useNotificationPreferences();
 */
import { useCallback, useEffect, useState } from 'react';
import { DEBUG } from '@/constants/devConfig';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMe, updateNotificationPreferences } from '@/services/api/user';
import type { AsyncState, NotificationPreferences } from '@/services/mockData/types';

type PrefKey = keyof NotificationPreferences;

export function useNotificationPreferences() {
  const { session, isAnonymous } = useAuth();
  const token = session?.access_token ?? null;
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
      const me = await fetchMe(token);
      setState({
        status: 'success',
        data: {
          notif_favorites: me.notif_favorites ?? true,
          notif_regional: me.notif_regional ?? true,
          notif_terrain: me.notif_terrain ?? true,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      if (DEBUG) console.debug('[useNotificationPreferences] load error', { message });
      setState({ status: 'error', error: message });
    }
  }, [anonymous, token]);

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
      try {
        await updateNotificationPreferences(token, { [key]: next[key] });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        if (DEBUG) console.debug('[useNotificationPreferences] toggle error', { message });
        setState({ status: 'success', data: previous });
      }
    },
    [state, token],
  );

  return { state, toggle, refresh: load };
}
