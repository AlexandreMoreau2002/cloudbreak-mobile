/**
 * useWeekData — source de données unique pour WeekStrip et ScoreCard.
 *
 * Précharge les 7 prochains jours × 6 créneaux horaires en parallèle.
 * Garantit que le score affiché dans la card et dans le weekly proviennent
 * du même fetch, éliminant toute incohérence entre les deux composants.
 *
 * Comportement :
 * - Changement de sommet → reset immédiat (pas de score obsolète affiché)
 * - Même sommet, refresh → garde les données le temps du re-fetch
 * - Cache AsyncStorage 30 min (bypass si MOCK_API)
 * - Tie-break : 06h > 08h > 16h > 14h > 10h > 12h
 */
import { MOCK_API } from '@/constants/devConfig';
import { fetchScore } from '@/services/api/score';
import { addDays, getTodayISO } from '@/utils/dateUtils';
import type { ScoreResponse } from '@/services/mockData/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DayScore, WeekScores } from '@/hooks/useWeekScores';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WeekData = {
  byDate: Record<string, Record<number, ScoreResponse>>;
  bestByDate: WeekScores;
};

const CACHE_VERSION = 'v2';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
const DAY_HOURS = [6, 8, 10, 12, 14, 16] as const;
const TIEBREAKER: Record<number, number> = { 6: 0, 8: 1, 16: 2, 14: 3, 10: 4, 12: 5 };

function weekCacheKey(peakId: string, today: string): string {
  return `cache:weekdata:${CACHE_VERSION}:${peakId}:${today}`;
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
): { data: WeekData | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedPeakRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!peakId || !token) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Changement de sommet → reset immédiat pour ne pas afficher un score obsolète
    if (peakId !== loadedPeakRef.current) {
      setData(null);
      setError(null);
    }
    setLoading(true);

    const today = getTodayISO();
    const cacheK = weekCacheKey(peakId, today);

    if (!MOCK_API) {
      try {
        const raw = await AsyncStorage.getItem(cacheK);
        if (raw) {
          const { byDate, cachedAt } = JSON.parse(raw) as {
            byDate: Record<string, Record<number, ScoreResponse>>;
            cachedAt: number;
          };
          const todayHours = byDate[today];
          const cacheValid =
            Date.now() - cachedAt < CACHE_TTL_MS &&
            todayHours != null &&
            Object.keys(todayHours).length > 0;
          if (cacheValid) {
            loadedPeakRef.current = peakId;
            setData({ byDate, bestByDate: computeBestByDate(byDate) });
            setLoading(false);
            return;
          }
        }
      } catch {
        // Cache read failure — non-fatal
      }
    }

    // Fetch réseau : 7 jours × 6 créneaux en parallèle
    const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));
    const byDate: Record<string, Record<number, ScoreResponse>> = {};
    let totalSuccess = 0;
    let isServiceUnavailable = false;

    await Promise.all(
      dates.map(async (date) => {
        const results = await Promise.all(
          DAY_HOURS.map((hour) =>
            fetchScore(token, peakId, date, hour)
              .then((result) => ({ hour, result }))
              .catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : '';
                if (msg.includes('503') || msg.toLowerCase().includes('unavailable')) {
                  isServiceUnavailable = true;
                }
                return null;
              }),
          ),
        );
        const hoursMap: Record<number, ScoreResponse> = {};
        for (const r of results) {
          if (r) {
            hoursMap[r.hour] = r.result;
            totalSuccess++;
          }
        }
        byDate[date] = hoursMap;
      }),
    );

    loadedPeakRef.current = peakId;
    if (totalSuccess === 0) {
      const errMsg = isServiceUnavailable
        ? 'Service momentanément indisponible'
        : 'Erreur de chargement';
      setError(errMsg);
      setLoading(false);
      return;
    }

    const weekData: WeekData = { byDate, bestByDate: computeBestByDate(byDate) };
    setData(weekData);
    setError(null);
    setLoading(false);

    if (!MOCK_API) {
      try {
        await AsyncStorage.setItem(cacheK, JSON.stringify({ byDate, cachedAt: Date.now() }));
      } catch {
        // Cache write failure — non-fatal
      }
    }
  }, [peakId, token]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error };
}
