import { useCallback, useEffect, useRef, useState } from 'react';

import { DEBUG } from '@/constants/devConfig';
import { useAuth } from '@/contexts/AuthContext';
import type { AsyncState } from '@/services/mockData/types';
import { fetchMe, updateDisplayName } from '@/services/api/user';

interface SessionState {
  identity: string | null;
  value: AsyncState<string | null>;
}

export function useDisplayName() {
  const { session, isAnonymous } = useAuth();
  const token = session?.access_token ?? null;
  const anonymous = isAnonymous || session?.user?.is_anonymous === true;
  const identity = anonymous || !token ? null : `${session?.user?.id}:${token}`;
  const generation = useRef(0);
  const [snapshot, setSnapshot] = useState<SessionState>({
    identity,
    value: { status: 'idle' },
  });
  const state = snapshot.identity === identity ? snapshot.value : { status: 'idle' } as AsyncState<string | null>;

  const refresh = useCallback(async () => {
    if (!identity || !token) {
      setSnapshot({ identity: null, value: { status: 'idle' } });
      return;
    }

    const requestGeneration = generation.current;
    if (DEBUG) console.debug('[useDisplayName] load');
    setSnapshot((previous) => ({
      identity,
      value: {
        status: 'loading',
        data: previous.identity === identity ? previous.value.data : undefined,
      },
    }));
    try {
      const me = await fetchMe(token);
      if (generation.current !== requestGeneration) return;
      setSnapshot({ identity, value: { status: 'success', data: me.display_name ?? null } });
    } catch (error) {
      if (generation.current !== requestGeneration) return;
      if (DEBUG) console.debug('[useDisplayName] load error', {
        category: error instanceof Error ? error.name : 'unknown',
      });
      setSnapshot((previous) => ({
        identity,
        value: {
          status: 'error',
          data: previous.identity === identity ? previous.value.data : undefined,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      }));
    }
  }, [identity, token]);

  useEffect(() => {
    generation.current += 1;
    void refresh();
    return () => { generation.current += 1; };
  }, [refresh]);

  const save = useCallback(async (displayName: string | null) => {
    if (!identity || !token) return;

    const previous = state.data;
    const requestGeneration = generation.current;
    if (DEBUG) console.debug('[useDisplayName] save');
    setSnapshot({ identity, value: { status: 'loading', data: previous } });
    try {
      const profile = await updateDisplayName(token, displayName);
      if (generation.current !== requestGeneration) return;
      setSnapshot({ identity, value: { status: 'success', data: profile.display_name ?? null } });
    } catch (error) {
      if (generation.current !== requestGeneration) return;
      if (DEBUG) console.debug('[useDisplayName] save error', {
        category: error instanceof Error ? error.name : 'unknown',
      });
      setSnapshot({
        identity,
        value: {
          status: 'error',
          data: previous,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      });
    }
  }, [identity, state.data, token]);

  return { state, save, refresh };
}
