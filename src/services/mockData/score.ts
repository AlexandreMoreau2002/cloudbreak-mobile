import type { ScoreResponse } from '@/services/mockData/types';

/** Score "high" — conditions optimales de mer de nuage */
export const MOCK_SCORE_HIGH: ScoreResponse = {
  score: 84,
  verdict: 'high',
  cloud_base: 1200,
  peak_name: 'Croix de Chamrousse',
  peak_altitude: 2257,
  conditions: {
    cloud_base_score: 0.95,
    humidity_score: 0.88,
    wind_score: 0.82,
    inversion_score: 0.91,
  },
};

/** Score "medium" — conditions incertaines */
export const MOCK_SCORE_MEDIUM: ScoreResponse = {
  score: 54,
  verdict: 'medium',
  cloud_base: 1800,
  peak_name: 'Grand Veymont',
  peak_altitude: 2341,
  conditions: {
    cloud_base_score: 0.6,
    humidity_score: 0.55,
    wind_score: 0.7,
    inversion_score: 0.4,
  },
};

/** Score "low" — pas de mer de nuage */
export const MOCK_SCORE_LOW: ScoreResponse = {
  score: 22,
  verdict: 'low',
  cloud_base: 3200,
  peak_name: 'Mont Blanc',
  peak_altitude: 4808,
  conditions: {
    cloud_base_score: 0.1,
    humidity_score: 0.3,
    wind_score: 0.2,
    inversion_score: 0.15,
  },
};

/** Map peak_id → score mock (utilise high par défaut) */
export function getMockScore(peak_id: string): ScoreResponse {
  if (peak_id === 'peak-mont-blanc') return MOCK_SCORE_LOW;
  if (peak_id === 'peak-grand-veymont') return MOCK_SCORE_MEDIUM;
  return MOCK_SCORE_HIGH;
}
