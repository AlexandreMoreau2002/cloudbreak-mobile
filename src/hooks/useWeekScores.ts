/**
 * useWeekScores — calcule le meilleur score journalier sur les 7 prochains jours.
 *
 * Le calendrier doit rester indépendant du chip horaire sélectionné dans la
 * score card: il affiche la meilleure fenêtre de chaque journée.
 */
import { useEffect, useState } from 'react';
import { DEBUG } from '@/constants/devConfig';
import { fetchScore } from '@/services/api/score';

export type DayScore = { score: number; verdict: string; hour: number };
export type WeekScores = Record<string, DayScore>;
const DAY_HOURS = [6, 8, 10, 12, 14, 16] as const;
const TIEBREAKER_PRIORITY: Record<number, number> = {
  6: 0,
  8: 1,
  16: 2,
  14: 3,
  10: 4,
  12: 5,
};

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

    if (DEBUG) console.debug('[useWeekScores] fetching week scores', { peakId, hours: DAY_HOURS, dates });

    const promises = dates.map((date) =>
      Promise.all(
        DAY_HOURS.map((hour) =>
          fetchScore(token, peakId, date, hour)
            .then((result) => ({ hour, result }))
            .catch((err) => {
              if (DEBUG) console.debug('[useWeekScores] fetch failed for date/hour', { date, hour, err });
              return null;
            }),
        ),
      ).then((dayResults) => {
        const best = dayResults.reduce<DayScore | null>((currentBest, result) => {
          if (!result) return currentBest;

          const candidate: DayScore = {
            score: result.result.score,
            verdict: result.result.verdict,
            hour: result.hour,
          };

          if (!currentBest) {
            return candidate;
          }

          if (candidate.score > currentBest.score) {
            return candidate;
          }

          if (
            candidate.score === currentBest.score
            && TIEBREAKER_PRIORITY[candidate.hour] < TIEBREAKER_PRIORITY[currentBest.hour]
          ) {
            return candidate;
          }

          return currentBest;
        }, null);

        return best ? { date, ...best } : null;
      }),
    );

    Promise.all(promises).then((results) => {
      const map: WeekScores = {};
      for (const result of results) {
        if (result !== null) {
          map[result.date] = {
            score: result.score,
            verdict: result.verdict,
            hour: result.hour,
          };
        }
      }
      if (DEBUG) console.debug('[useWeekScores] success', { count: Object.keys(map).length });
      setWeekScores(map);
    });
  }, [peakId, token]);

  return weekScores;
}
