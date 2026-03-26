/**
 * useWeekScores — fetche les scores des 7 prochains jours pour un sommet à une heure donnée.
 *
 * Retourne une map { [dateISO]: { score: number; verdict: string } } ou null si pas de données.
 */
import { useEffect, useState } from 'react';
import { DEBUG } from '@/constants/devConfig';
import { fetchScore } from '@/services/api/score';

export type DayScore = { score: number; verdict: string };
export type WeekScores = Record<string, DayScore>;

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

export function useWeekScores(
  peakId: string | null,
  hour: number,
  token: string | null,
): WeekScores | null {
  const [weekScores, setWeekScores] = useState<WeekScores | null>(null);

  useEffect(() => {
    if (!peakId || !token) {
      if (DEBUG) console.debug('[useWeekScores] idle — peakId or token missing', { peakId, token: !!token });
      setWeekScores(null);
      return;
    }

    const today = getTodayISO();
    const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));

    if (DEBUG) console.debug('[useWeekScores] fetching week scores', { peakId, hour, dates });

    const promises = dates.map((date) =>
      fetchScore(token, peakId, date, hour)
        .then((res) => ({ date, score: res.score, verdict: res.verdict }))
        .catch((err) => {
          if (DEBUG) console.debug('[useWeekScores] fetch failed for date', { date, err });
          return null;
        }),
    );

    Promise.all(promises).then((results) => {
      const map: WeekScores = {};
      for (const result of results) {
        if (result !== null) {
          map[result.date] = { score: result.score, verdict: result.verdict };
        }
      }
      if (DEBUG) console.debug('[useWeekScores] success', { count: Object.keys(map).length });
      setWeekScores(map);
    });
  }, [peakId, hour, token]);

  return weekScores;
}
