/**
 * useScore — hook qui fetche le score mer de nuage pour le sommet/date sélectionnés.
 *
 * Usage :
 *   const state = useScore(peakId, date, hour, token);
 */
import { fetchScore } from '@/services/api/score';
import { DEBUG, MOCK_API } from '@/constants/devConfig';
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AsyncState, ScoreResponse } from '@/services/mockData/types';

const SCORE_CACHE_VERSION = 'v2';
const CACHE_TTL_MS = 7200 * 1000; // 2h

interface CacheEntry {
  data: ScoreResponse;
  cachedAt: number;
}

function hasExpectedLabelCode(data: ScoreResponse): boolean {
  return data.label_code === `score.label.${data.verdict}`;
}

function hasCompatibleContextCode(data: ScoreResponse): boolean {
  if (!data.context_code) return false;

  if (data.verdict === 'none') return data.context_code.startsWith('score.context.none.');
  if (data.verdict === 'high') return data.context_code.startsWith('score.context.high.');
  if (data.verdict === 'medium') return data.context_code.startsWith('score.context.medium.');
  return data.context_code.startsWith('score.context.low.');
}

function isCacheEntryCompatible(entry: CacheEntry): boolean {
  return hasExpectedLabelCode(entry.data) && hasCompatibleContextCode(entry.data);
}

function cacheKey(peakId: string, date: string, hour: number): string {
  return `cache:score:${SCORE_CACHE_VERSION}:${peakId}:${date}:${hour}`;
}

export function useScore(
  peakId: string | null,
  date: string,
  hour: number,
  token: string | null,
): AsyncState<ScoreResponse> {
  const [state, setState] = useState<AsyncState<ScoreResponse>>({ status: 'idle' });

  const load = useCallback(async () => {
    if (!token || !peakId) {
      if (DEBUG) console.debug('[useScore] idle — token or peakId missing', { peakId, token: !!token });
      setState({ status: 'idle' });
      return;
    }
    if (DEBUG) console.debug('[useScore] fetching', { peakId, date, hour });
    setState({ status: 'loading' });

    // Cache offline — skip when MOCK_API (already fast)
    if (!MOCK_API) {
      try {
        const raw = await AsyncStorage.getItem(cacheKey(peakId, date, hour));
        if (raw) {
          const entry: CacheEntry = JSON.parse(raw);
          const age = Date.now() - entry.cachedAt;
          if (age < CACHE_TTL_MS && isCacheEntryCompatible(entry)) {
            if (DEBUG) console.debug('[useScore] cache hit', { peakId, date, hour, ageMs: age });
            setState({ status: 'success', data: entry.data });
            return;
          }
          if (DEBUG) console.debug('[useScore] cache miss/expired', { peakId, date, hour, ageMs: age });
        } else {
          if (DEBUG) console.debug('[useScore] cache miss/expired', { peakId, date, hour, ageMs: null });
        }
      } catch {
        // Cache read failure is non-fatal — continue with network call
      }
    }

    try {
      const data = await fetchScore(token, peakId, date, hour);
      if (DEBUG) console.debug('[useScore] success', { score: data.score, verdict: data.verdict });

      // Persist to cache
      if (!MOCK_API) {
        try {
          const entry: CacheEntry = { data, cachedAt: Date.now() };
          await AsyncStorage.setItem(cacheKey(peakId, date, hour), JSON.stringify(entry));
        } catch {
          // Cache write failure is non-fatal
        }
      }

      setState({ status: 'success', data });
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erreur inconnue';
      const message = raw.includes('503') || raw.toLowerCase().includes('unavailable')
        ? 'Service momentanément indisponible'
        : 'Erreur de chargement';
      if (DEBUG) console.debug('[useScore] error', { message });
      setState({ status: 'error', error: message });
    }
  }, [peakId, date, hour, token]);

  useEffect(() => {
    load();
  }, [load]);

  return state;
}
