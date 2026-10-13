/**
 * api/score — appel score mer de nuage.
 *
 * Usage :
 *   import { fetchScore } from '@/services/api/score';
 */
import { addDays } from '@/utils/dateUtils';
import { MOCK_API, DEBUG } from '@/constants/devConfig';
import { apiFetch, _delay } from '@/services/fetchService';
import type { ScoreResponse } from '@/services/mockData/types';
import { getMockScore, normalizeScoreResponse } from '@/services/mockData/score';

const WEEK_DAYS = 7;
const WEEK_HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22] as const;
const TIEBREAKER: Record<number, number> = { 6: 0, 8: 1, 16: 2, 14: 3, 10: 4, 12: 5, 18: 6, 20: 7, 22: 8 };
type DayScore = { score: number; verdict: string; hour: number };
type WeekScores = Record<string, DayScore>;

export type WeekScoreData = {
  byDate: Record<string, Record<number, ScoreResponse>>;
  bestByDate: WeekScores;
};

type WeekScorePayload = {
  by_date?: unknown;
};

function computeBestByDate(byDate: WeekScoreData['byDate']): WeekScores {
  const bestByDate: WeekScores = {};
  for (const [date, scoresByHour] of Object.entries(byDate)) {
    let best: DayScore | null = null;
    for (const [hourValue, score] of Object.entries(scoresByHour)) {
      const hour = Number(hourValue);
      const candidate: DayScore = { score: score.score, verdict: score.verdict, hour };
      if (
        !best ||
        candidate.score > best.score ||
        (candidate.score === best.score && (TIEBREAKER[candidate.hour] ?? 99) < (TIEBREAKER[best.hour] ?? 99))
      ) {
        best = candidate;
      }
    }
    if (best) bestByDate[date] = best;
  }
  return bestByDate;
}

function normalizeWeekPayload(payload: WeekScorePayload, startDate: string): WeekScoreData {
  if (typeof payload.by_date !== 'object' || payload.by_date === null || Array.isArray(payload.by_date)) {
    throw new Error('Réponse hebdomadaire invalide');
  }

  const byDate: WeekScoreData['byDate'] = {};
  const source = payload.by_date as Record<string, unknown>;
  const expectedDates = Array.from({ length: WEEK_DAYS }, (_, index) => addDays(startDate, index));
  if (Object.keys(source).some((date) => !expectedDates.includes(date))) {
    throw new Error('Réponse hebdomadaire invalide');
  }
  if (expectedDates.some((date) => !(date in source))) {
    throw new Error('Réponse hebdomadaire incomplète');
  }
  for (const date of expectedDates) {
    const sourceDay = source[date];
    if (typeof sourceDay !== 'object' || sourceDay === null || Array.isArray(sourceDay)) {
      throw new Error('Réponse hebdomadaire incomplète');
    }

    const normalizedDay: Record<number, ScoreResponse> = {};
    const sourceHours = sourceDay as Record<string, unknown>;
    if (Object.keys(sourceHours).some((hour) => !WEEK_HOURS.includes(Number(hour) as (typeof WEEK_HOURS)[number]))) {
      throw new Error('Réponse hebdomadaire invalide');
    }
    if (WEEK_HOURS.some((hour) => !(String(hour) in sourceHours))) {
      throw new Error('Réponse hebdomadaire incomplète');
    }
    for (const hour of WEEK_HOURS) {
      const rawScore = sourceHours[String(hour)];
      if (typeof rawScore !== 'object' || rawScore === null || Array.isArray(rawScore)) {
        throw new Error('Réponse hebdomadaire incomplète');
      }
      normalizedDay[hour] = normalizeScoreResponse(rawScore as Partial<ScoreResponse>);
    }
    byDate[date] = normalizedDay;
  }

  return { byDate, bestByDate: computeBestByDate(byDate) };
}

export async function fetchScore(
  token: string,
  peak_id: string,
  date: string,
  hour: number = 6,
): Promise<ScoreResponse> {
  if (MOCK_API) {
    if (DEBUG) console.debug('[api/score] MOCK fetchScore', { peak_id, date, hour });
    await _delay(400);
    return normalizeScoreResponse(getMockScore(peak_id));
  }
  const response = await apiFetch<Partial<ScoreResponse>>('/api/v1/score', token, {
    peak_id,
    date,
    hour: String(hour),
  });
  return normalizeScoreResponse(response);
}

export async function fetchWeekScores(
  token: string,
  peakId: string,
  startDate: string,
): Promise<WeekScoreData> {
  if (MOCK_API) {
    if (DEBUG) console.debug('[api/score] MOCK fetchWeekScores', { peakId, startDate });
    await _delay(400);
    const byDate = Object.fromEntries(
      Array.from({ length: WEEK_DAYS }, (_, index) => {
        const date = addDays(startDate, index);
        return [
          date,
          Object.fromEntries(WEEK_HOURS.map((hour) => [hour, getMockScore(peakId)])),
        ];
      }),
    );
    return normalizeWeekPayload({ by_date: byDate }, startDate);
  }

  const response = await apiFetch<WeekScorePayload>('/api/v1/score/week', token, {
    peak_id: peakId,
    start_date: startDate,
  });
  return normalizeWeekPayload(response, startDate);
}
