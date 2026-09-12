/**
 * useOnboardingPeaks — sommets curés + recherche publique pour l'onboarding.
 *
 * Usage :
 *   const { curated, results, query, setQuery, retry } = useOnboardingPeaks();
 */
import { useEffect, useState } from 'react';
import { DEBUG } from '@/constants/devConfig';
import { CURATED_PEAKS } from '@/constants/onboardingPeaks';
import type { AsyncState, Peak } from '@/services/mockData/types';
import { searchPeaks, fetchPeakBySlug } from '@/services/api/peaks';

const DEBOUNCE_MS = 300;

export function useOnboardingPeaks() {
  const [query, setQuery] = useState('');
  const [curatedAttempt, setCuratedAttempt] = useState(0);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [curated, setCurated] = useState<AsyncState<Peak[]>>({ status: 'loading' });
  const [results, setResults] = useState<AsyncState<Peak[]>>({ status: 'idle' });

  useEffect(() => {
    let mounted = true;
    setCurated({ status: 'loading' });
    async function loadCurated() {
      try {
        const settled = await Promise.allSettled(CURATED_PEAKS.map((c) => fetchPeakBySlug(null, c.slug)));
        const peaks = settled.flatMap((item) => item.status === 'fulfilled' ? [item.value] : []);
        if (peaks.length === 0) {
          const failure = settled.find((item) => item.status === 'rejected');
          /* istanbul ignore next -- CURATED_PEAKS est non vide : un rejet existe toujours si peaks est vide */
          throw failure?.status === 'rejected' ? failure.reason : new Error('Erreur inconnue');
        }
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
  }, [curatedAttempt]);

  useEffect(() => {
    if (query.length < 2) {
      setResults((prev) => (prev.status === 'idle' ? prev : { status: 'idle' }));
      return;
    }
    const controller = new AbortController();
    let active = true;
    /* istanbul ignore next -- diagnostic disponible uniquement dans les builds DEBUG */
    if (DEBUG) console.debug('[useOnboardingPeaks] search loading');
    setResults({ status: 'loading' });
    const timer = setTimeout(async () => {
      try {
        const data = await searchPeaks(null, query, controller.signal);
        if (active) {
          /* istanbul ignore next -- diagnostic disponible uniquement dans les builds DEBUG */
          if (DEBUG) console.debug('[useOnboardingPeaks] search success', { count: data.length });
          setResults({ status: 'success', data });
        }
      } catch (err) {
        if (!active || (err instanceof Error && err.name === 'AbortError')) return;
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        /* istanbul ignore next -- diagnostic disponible uniquement dans les builds DEBUG */
        if (DEBUG) console.debug('[useOnboardingPeaks] search error', { message });
        setResults({ status: 'error', error: message });
      }
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchAttempt]);

  function retry() {
    if (query.length >= 2) setSearchAttempt((attempt) => attempt + 1);
    else setCuratedAttempt((attempt) => attempt + 1);
  }

  return { curated, results, query, setQuery, retry };
}
