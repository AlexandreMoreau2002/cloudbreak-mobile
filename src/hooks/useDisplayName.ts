import { useCallback, useEffect, useState } from 'react';
import { DEBUG } from '@/constants/devConfig';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMe, updateDisplayName } from '@/services/api/user';
import type { AsyncState } from '@/services/mockData/types';

export function useDisplayName() {
  const { session, isAnonymous } = useAuth();
  const token = session?.access_token ?? null;
  const anonymous = isAnonymous || session?.user?.is_anonymous === true;
  const [state, setState] = useState<AsyncState<string | null>>({ status: 'idle' });

  const refresh = useCallback(async () => {
    if (anonymous || !token) {
      setState({ status: 'idle' });
      return;
    }

    if (DEBUG) console.debug('[useDisplayName] load');
    setState((previous) => ({ status: 'loading', data: previous.data }));
    try {
      const me = await fetchMe(token);
      setState({ status: 'success', data: me.display_name ?? null });
    } catch (error) {
      if (DEBUG) console.debug('[useDisplayName] load error', {
        category: error instanceof Error ? error.name : 'unknown',
      });
      setState((previous) => ({
        status: 'error',
        data: previous.data,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }));
    }
  }, [anonymous, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (displayName: string | null) => {
    if (anonymous || !token) return;

    const previous = state.data;
    if (DEBUG) console.debug('[useDisplayName] save');
    setState({ status: 'loading', data: previous });
    try {
      const profile = await updateDisplayName(token, displayName);
      setState({ status: 'success', data: profile.display_name ?? null });
    } catch (error) {
      if (DEBUG) console.debug('[useDisplayName] save error', {
        category: error instanceof Error ? error.name : 'unknown',
      });
      setState({
        status: 'error',
        data: previous,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }, [anonymous, state.data, token]);

  return { state, save, refresh };
}
