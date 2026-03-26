/**
 * api/score — appel score mer de nuage.
 *
 * Usage :
 *   import { fetchScore } from '@/services/api/score';
 */
import { MOCK_API, DEBUG } from '@/constants/devConfig';
import { apiFetch, _delay } from '@/services/fetchService';
import type { ScoreResponse } from '@/services/mockData/types';
import { getMockScore, normalizeScoreResponse } from '@/services/mockData/score';

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
