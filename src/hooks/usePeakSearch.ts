/**
 * usePeakSearch — hook debounced pour l'autocomplete de recherche de sommets.
 *
 * Usage :
 *   const { state, query, setQuery } = usePeakSearch();
 */
import { useEffect, useRef, useState } from 'react';
import { DEBUG } from '@/constants/devConfig';
import { searchPeaks } from '@/services/api/peaks';
import { useAuth } from '@/contexts/AuthContext';
import type { AsyncState, Peak } from '@/services/mockData/types';

const DEBOUNCE_MS = 300;

export function usePeakSearch() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const [query, setQuery] = useState('');
  const [state, setState] = useState<AsyncState<Peak[]>>({ status: 'idle' });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (query.length < 2) {
      setState((prev) => (prev.status === 'idle' ? prev : { status: 'idle' }));
      return;
    }

    setState({ status: 'loading' });

    timerRef.current = setTimeout(async () => {
      if (!token) {
        setState({ status: 'error', error: 'Non authentifié' });
        return;
      }
      if (DEBUG) console.debug('[usePeakSearch] fetching', { query });
      try {
        const results = await searchPeaks(token, query);
        if (DEBUG) console.debug('[usePeakSearch] success', { count: results.length });
        setState({ status: 'success', data: results });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        if (DEBUG) console.debug('[usePeakSearch] error', { message });
        setState({ status: 'error', error: message });
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, token]);

  return { state, query, setQuery };
}
