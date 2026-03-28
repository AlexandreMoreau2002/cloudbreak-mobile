/**
 * usePeakSearch — hook debounced pour l'autocomplete de recherche de sommets.
 *
 * Usage :
 *   const { state, query, setQuery } = usePeakSearch();
 */
import { DEBUG } from '@/constants/devConfig';
import { useAuth } from '@/contexts/AuthContext';
import { searchPeaks } from '@/services/api/peaks';
import { useEffect, useRef, useState } from 'react';
import type { AsyncState, Peak } from '@/services/mockData/types';

const DEBOUNCE_MS = 300;

export function usePeakSearch() {
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const token = session?.access_token ?? null;
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<AsyncState<Peak[]>>({ status: 'idle' });

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
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      if (DEBUG) console.debug('[usePeakSearch] fetching', { query });
      try {
        const results = await searchPeaks(token, query, signal);
        if (DEBUG) console.debug('[usePeakSearch] success', { count: results.length });
        setState({ status: 'success', data: results });
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
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
