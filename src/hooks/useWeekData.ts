/**
 * useWeekData — source de données unique pour WeekStrip et ScoreCard.
 *
 * Charge les 7 prochains jours × 9 créneaux horaires en une requête groupée.
 * Garantit que le score affiché dans la card et dans le weekly proviennent
 * du même fetch, éliminant toute incohérence entre les deux composants.
 *
 * Comportement :
 * - Changement de sommet → reset immédiat (pas de score obsolète affiché)
 * - Même sommet, refresh → garde les données le temps du re-fetch
 * - Cache AsyncStorage 3h (bypass si MOCK_API)
 * - Tie-break : 06h > 08h > 16h > 14h > 10h > 12h > 18h > 20h > 22h
 */
import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchWeekScores } from '@/services/api/score';
import { DEBUG, MOCK_API } from '@/constants/devConfig';
import { addDays, getTodayISO } from '@/utils/dateUtils';
import { isApiErrorCode } from '@/services/fetchService';
import { debugDataRefresh } from '@/services/dataRefreshDebug';
import type { ScoreResponse } from '@/services/mockData/types';
import type { DayScore, WeekScores } from '@/hooks/useWeekScores';

export type WeekData = {
  byDate: Record<string, Record<number, ScoreResponse>>;
  bestByDate: WeekScores;
};

const CACHE_VERSION = 'v5';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3h
const WEEK_DAYS = 7;
const WEEK_HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22] as const;
const TIEBREAKER: Record<number, number> = { 6: 0, 8: 1, 16: 2, 14: 3, 10: 4, 12: 5, 18: 6, 20: 7, 22: 8 };

function weekCacheKey(peakId: string, today: string): string {
  return `cache:weekdata:${CACHE_VERSION}:${peakId}:${today}`;
}

function isCompleteWeek(
  byDate: Record<string, Record<number, ScoreResponse>>,
  startDate: string,
): boolean {
  return Array.from({ length: WEEK_DAYS }, (_, index) => addDays(startDate, index)).every((date) => {
    const scoresByHour = byDate[date];
    return scoresByHour != null && WEEK_HOURS.every((hour) => scoresByHour[hour] != null);
  });
}

function computeBestByDate(
  byDate: Record<string, Record<number, ScoreResponse>>,
): WeekScores {
  const best: WeekScores = {};
  for (const [date, hours] of Object.entries(byDate)) {
    let bestDay: DayScore | null = null;
    for (const [hourStr, score] of Object.entries(hours)) {
      const hour = Number(hourStr);
      const candidate: DayScore = { score: score.score, verdict: score.verdict, hour };
      if (!bestDay) {
        bestDay = candidate;
      } else if (candidate.score > bestDay.score) {
        bestDay = candidate;
      } else if (
        candidate.score === bestDay.score &&
        (TIEBREAKER[hour] ?? 99) < (TIEBREAKER[bestDay.hour] ?? 99)
      ) {
        bestDay = candidate;
      }
    }
    if (bestDay) best[date] = bestDay;
  }
  return best;
}

export function useWeekData(
  peakId: string | null,
  token: string | null,
): {
  // Interface historique multi-états conservée pour ne pas casser les consommateurs existants.
  data: WeekData | null;
  loading: boolean;
  error: string | null;
  quotaExceeded: boolean;
  rateLimited: boolean;
  fromCache: boolean;
  isOffline: boolean;
  cachedAt: number | null;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const loadedPeakRef = useRef<string | null>(null);
  const offlineRef = useRef(false);

  const load = useCallback(async (force = false) => {
    const updateOffline = (nextIsOffline: boolean) => {
      if (offlineRef.current !== nextIsOffline) {
        offlineRef.current = nextIsOffline;
        setIsOffline(nextIsOffline);
      }
    };

    if (!peakId || !token) {
      setData(null);
      setLoading(false);
      setError(null);
      setQuotaExceeded(false);
      setRateLimited(false);
      updateOffline(false);
      return;
    }

    // Changement de sommet → reset immédiat pour ne pas afficher un score obsolète
    if (peakId !== loadedPeakRef.current) {
      setData(null);
      setError(null);
      setQuotaExceeded(false);
      setRateLimited(false);
      setFromCache(false);
      setCachedAt(null);
      updateOffline(false);
    }
    setLoading(true);

    const today = getTodayISO();
    const cacheK = weekCacheKey(peakId, today);

    let hasValidCache = false;

    if (!MOCK_API) {
      try {
        const raw = await AsyncStorage.getItem(cacheK);
        if (raw) {
          const { byDate, cachedAt } = JSON.parse(raw) as {
            byDate: Record<string, Record<number, ScoreResponse>>;
            cachedAt: number;
          };
          const cacheValid =
            Date.now() - cachedAt < CACHE_TTL_MS &&
            isCompleteWeek(byDate, today);
          if (cacheValid) {
            if (DEBUG) console.debug('[useWeekData] cache', { key: cacheK, hit: true, age: Date.now() - cachedAt });
            loadedPeakRef.current = peakId;
            setData({ byDate, bestByDate: computeBestByDate(byDate) });
            setFromCache(true);
            setCachedAt(cachedAt);
            setLoading(false);
            hasValidCache = true;
          }
        }
      } catch {
        // Cache read failure — non-fatal
      }
    }

    if (DEBUG && !hasValidCache) console.debug('[useWeekData] cache', { key: cacheK, hit: false });

    const netState = await NetInfo.fetch();
    if (netState.isConnected === false) {
      updateOffline(true);
      if (hasValidCache) {
        setError(null);
        setLoading(false);
        return;
      }
      if (force) {
        // Refresh manuel hors-ligne : on garde les données déjà affichées, pas d'erreur bloquante
        setLoading(false);
        return;
      }
      setError('OFFLINE_NO_CACHE');
      setLoading(false);
      return;
    }

    updateOffline(false);
    if (hasValidCache && !force) {
      setError(null);
      setLoading(false);
      return;
    }

    if (DEBUG) console.debug('[useWeekData] fetch', { peakId, dates: 7 });
    debugDataRefresh('week-data', force ? 'manual' : 'mount-or-session', {
      requestCount: 1,
    });

    try {
      const weekData = await fetchWeekScores(token, peakId, today);
      loadedPeakRef.current = peakId;
      setData(weekData);
      setFromCache(false);
      setCachedAt(null);
      setError(null);
      setQuotaExceeded(false);
      setRateLimited(false);

      if (!MOCK_API) {
        try {
          await AsyncStorage.setItem(cacheK, JSON.stringify({ byDate: weekData.byDate, cachedAt: Date.now() }));
        } catch {
          // Cache write failure — non-fatal
        }
      }
    } catch (cause) {
      loadedPeakRef.current = peakId;
      if (isApiErrorCode(cause, 'QUOTA_EXCEEDED')) {
        setQuotaExceeded(true);
        setRateLimited(false);
        setError('QUOTA_EXCEEDED');
      } else if (isApiErrorCode(cause, 'RATE_LIMIT_EXCEEDED')) {
        setQuotaExceeded(false);
        setRateLimited(true);
        setError('RATE_LIMIT_EXCEEDED');
      } else if (!hasValidCache) {
        const message = cause instanceof Error ? cause.message : '';
        setError(message.toLowerCase().includes('unavailable') ? 'Service momentanément indisponible' : 'Erreur de chargement');
      }
    } finally {
      setLoading(false);
    }
  }, [peakId, token]);

  const refresh = useCallback(() => load(true), [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement/reset d'état déclenché par un changement de dépendance (pattern existant, comportement couvert par les tests)
    load();
  }, [load]);

  return { data, loading, error, quotaExceeded, rateLimited, fromCache, isOffline, cachedAt, refresh };
}
