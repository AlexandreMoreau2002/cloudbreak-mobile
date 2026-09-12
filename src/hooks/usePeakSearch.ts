/**
 * usePeakSearch — hook debounced pour l'autocomplete de recherche de sommets.
 *
 * Usage :
 *   const { state, query, setQuery } = usePeakSearch();
 */
import { useEffect, useState } from 'react';

import { track } from '@/services/analytics';
import { DEBUG } from '@/constants/devConfig';
import { useAuth } from '@/contexts/AuthContext';
import { searchPeaks } from '@/services/api/peaks';
import type { AsyncState, Peak } from '@/services/mockData/types';

const DEBOUNCE_MS = 300;

export function usePeakSearch() {
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const token = session?.access_token ?? null;
  const [state, setState] = useState<AsyncState<Peak[]>>({ status: 'idle' });

  useEffect(() => {
    if (query.length < 2) {
      setState((prev) => (prev.status === 'idle' ? prev : { status: 'idle' }));
      return;
    }

    setState({ status: 'loading' });

    const controller = new AbortController();
    const { signal } = controller;
    const timer = setTimeout(async () => {

      if (DEBUG) console.debug('[usePeakSearch] fetching', { query });
      try {
        const results = await searchPeaks(token, query, signal);
        if (signal.aborted) return;
        if (DEBUG) console.debug('[usePeakSearch] success', { count: results.length });
        track('search_performed', { query_length: query.length, results_count: results.length });
        setState({ status: 'success', data: results });
      } catch (err) {
        if (signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        if (DEBUG) console.debug('[usePeakSearch] error', { message });
        setState({ status: 'error', error: message });
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timer) clearTimeout(timer);
      controller.abort();
    };
  }, [query, token, retryCount]);

  const retry = () => setRetryCount((count) => count + 1);

  return { state, query, setQuery, retry };
}
