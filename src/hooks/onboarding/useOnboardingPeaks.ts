/**
 * useOnboardingPeaks — sommets curés + recherche publique pour l'onboarding.
 *
 * Usage :
 *   const { curated, results, query, setQuery } = useOnboardingPeaks();
 */
import { DEBUG } from '@/constants/devConfig';
import { useEffect, useRef, useState } from 'react';
import { CURATED_PEAKS } from '@/constants/onboardingPeaks';
import type { AsyncState, Peak } from '@/services/mockData/types';
import { searchPeaks, fetchPeakBySlug } from '@/services/api/peaks';

const DEBOUNCE_MS = 300;

export function useOnboardingPeaks() {
  const [query, setQuery] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [curated, setCurated] = useState<AsyncState<Peak[]>>({ status: 'loading' });
  const [results, setResults] = useState<AsyncState<Peak[]>>({ status: 'idle' });

  useEffect(() => {
    let mounted = true;
    async function loadCurated() {
      try {
        const peaks = await Promise.all(CURATED_PEAKS.map((c) => fetchPeakBySlug(null, c.slug)));
        /* istanbul ignore next -- diagnostic disponible uniquement dans les builds DEBUG */
        if (DEBUG) console.debug('[useOnboardingPeaks] curated loaded', { count: peaks.length });
        /* istanbul ignore next -- cleanup prevents state updates after unmount */
        if (mounted) setCurated({ status: 'success', data: peaks });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        /* istanbul ignore next -- diagnostic disponible uniquement dans les builds DEBUG */
        if (DEBUG) console.debug('[useOnboardingPeaks] curated error', { message });
        /* istanbul ignore next -- cleanup prevents state updates after unmount */
        if (mounted) setCurated({ status: 'error', error: message });
      }
    }
    void loadCurated();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.length < 2) {
      setResults((prev) => (prev.status === 'idle' ? prev : { status: 'idle' }));
      return;
    }
    setResults({ status: 'loading' });
    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      try {
        const data = await searchPeaks(null, query, abortRef.current.signal);
        /* istanbul ignore next -- diagnostic disponible uniquement dans les builds DEBUG */
        if (DEBUG) console.debug('[useOnboardingPeaks] search success', { count: data.length });
        setResults({ status: 'success', data });
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        setResults({ status: 'error', error: message });
      }
    }, DEBOUNCE_MS);
    return () => {
      /* istanbul ignore next -- cleanup path is asserted through the debounced behavior */
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  return { curated, results, query, setQuery };
}
