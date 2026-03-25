import type {
  ScoreCloudLayerViz,
  ScoreConditions,
  ScoreCloudLayerPoint,
  ScoreResponse,
} from '@/services/mockData/types';

export const SCORE_VERDICT_LABELS: Record<ScoreResponse['verdict'], string> = {
  none: 'Pas de mer de nuage',
  high: 'Fenetre optimale',
  medium: 'Fenetre correcte',
  low: 'Fenetre faible',
};

function buildConditions(conditions: Partial<ScoreConditions>): ScoreConditions {
  return {
    cloud_base_score: conditions.cloud_base_score ?? 0,
    humidity_score: conditions.humidity_score ?? 0,
    wind_score: conditions.wind_score ?? 0,
    inversion_score: conditions.inversion_score ?? 0,
    pressure_score: conditions.pressure_score ?? 0,
    cloud_base_m: conditions.cloud_base_m ?? null,
    humidity: conditions.humidity ?? conditions.humidity_pct ?? null,
    humidity_pct: conditions.humidity_pct ?? conditions.humidity ?? null,
    wind_speed: conditions.wind_speed ?? conditions.wind_speed_kmh ?? null,
    wind_speed_kmh: conditions.wind_speed_kmh ?? conditions.wind_speed ?? null,
    inversion_delta: conditions.inversion_delta ?? conditions.inversion_delta_c ?? null,
    inversion_delta_c: conditions.inversion_delta_c ?? conditions.inversion_delta ?? null,
    inversion_present: conditions.inversion_present ?? conditions.inversion_detected ?? null,
    inversion_detected: conditions.inversion_detected ?? conditions.inversion_present ?? null,
    pressure_hpa: conditions.pressure_hpa ?? null,
    cloud_cover_low_pct: conditions.cloud_cover_low_pct ?? null,
  };
}

function normalizePressureLevels(
  levels: ScoreCloudLayerViz['pressure_levels'] | undefined,
): ScoreCloudLayerPoint[] {
  return (levels ?? []).map((level) => ({
    pressure_hpa: level.pressure_hpa,
    altitude_m: level.altitude_m,
    relative_humidity: level.relative_humidity,
    temperature_c: level.temperature_c,
    dew_point_spread: level.dew_point_spread,
  }));
}

export function normalizeScoreResponse(score: Partial<ScoreResponse>): ScoreResponse {
  const verdict = score.verdict ?? 'none';

  return {
    score: score.score ?? 0,
    verdict,
    label: score.label ?? SCORE_VERDICT_LABELS[verdict],
    cloud_base: score.cloud_base ?? 0,
    peak_name: score.peak_name ?? '',
    peak_altitude: score.peak_altitude ?? 0,
    peak_slug: score.peak_slug ?? null,
    context_message: score.context_message ?? null,
    optimal_window_start: score.optimal_window_start ?? null,
    optimal_window_end: score.optimal_window_end ?? null,
    sunrise: score.sunrise ?? null,
    stability_hours: score.stability_hours ?? null,
    conditions: buildConditions(score.conditions ?? {}),
    cloud_layer_viz: score.cloud_layer_viz
      ? {
          summit_altitude: score.cloud_layer_viz.summit_altitude,
          cloud_base: score.cloud_layer_viz.cloud_base,
          pressure_levels: normalizePressureLevels(score.cloud_layer_viz.pressure_levels),
        }
      : null,
  };
}

function buildCloudLayerViz(
  summit_altitude: number,
  cloud_base: number,
  pressure_levels: ScoreCloudLayerViz['pressure_levels'],
): ScoreCloudLayerViz {
  return {
    summit_altitude,
    cloud_base,
    pressure_levels: normalizePressureLevels(pressure_levels),
  };
}

/** Score "high" — conditions optimales de mer de nuage */
export const MOCK_SCORE_HIGH: ScoreResponse = normalizeScoreResponse({
  score: 84,
  verdict: 'high',
  label: 'Fenetre optimale',
  cloud_base: 1200,
  peak_name: 'Croix de Chamrousse',
  peak_altitude: 2257,
  peak_slug: 'croix-de-chamrousse',
  context_message: null,
  optimal_window_start: '06:40',
  optimal_window_end: '08:15',
  sunrise: '07:02',
  stability_hours: 48,
  conditions: {
    cloud_base_score: 0.95,
    humidity_score: 0.88,
    wind_score: 0.82,
    inversion_score: 0.91,
    pressure_score: 0.86,
    cloud_base_m: 1200,
    humidity: 86,
    wind_speed: 7,
    inversion_delta: 4.8,
    inversion_present: true,
    pressure_hpa: 1028,
  },
  cloud_layer_viz: buildCloudLayerViz(2257, 1200, [
    { pressure_hpa: 925, altitude_m: 730, relative_humidity: 92, temperature_c: 8.3 },
    { pressure_hpa: 850, altitude_m: 1460, relative_humidity: 95, temperature_c: 10.6 },
    { pressure_hpa: 700, altitude_m: 3010, relative_humidity: 64, temperature_c: 2.1 },
  ]),
});

/** Score "medium" — conditions incertaines */
export const MOCK_SCORE_MEDIUM: ScoreResponse = normalizeScoreResponse({
  score: 54,
  verdict: 'medium',
  label: 'Fenetre correcte',
  cloud_base: 1800,
  peak_name: 'Grand Veymont',
  peak_altitude: 2341,
  peak_slug: 'grand-veymont',
  context_message: null,
  optimal_window_start: '07:10',
  optimal_window_end: '09:00',
  sunrise: '07:08',
  stability_hours: 18,
  conditions: {
    cloud_base_score: 0.6,
    humidity_score: 0.55,
    wind_score: 0.7,
    inversion_score: 0.4,
    pressure_score: 0.58,
    cloud_base_m: 1800,
    humidity: 74,
    wind_speed: 12,
    inversion_delta: 0.7,
    inversion_present: false,
    pressure_hpa: 1018,
  },
  cloud_layer_viz: buildCloudLayerViz(2341, 1800, [
    { pressure_hpa: 925, altitude_m: 730, relative_humidity: 79, temperature_c: 6.8 },
    { pressure_hpa: 850, altitude_m: 1460, relative_humidity: 83, temperature_c: 4.9 },
    { pressure_hpa: 700, altitude_m: 3010, relative_humidity: 56, temperature_c: -0.8 },
  ]),
});

/** Score "low" — pas de mer de nuage */
export const MOCK_SCORE_LOW: ScoreResponse = normalizeScoreResponse({
  score: 22,
  verdict: 'low',
  label: 'Fenetre faible',
  cloud_base: 3200,
  peak_name: 'Mont Blanc',
  peak_altitude: 4808,
  peak_slug: 'mont-blanc',
  context_message: 'Pas de mer de nuage - mais ciel parfaitement dégagé au-dessus de 2400m ☀️',
  optimal_window_start: null,
  optimal_window_end: null,
  sunrise: '07:06',
  stability_hours: 8,
  conditions: {
    cloud_base_score: 0.1,
    humidity_score: 0.3,
    wind_score: 0.2,
    inversion_score: 0.15,
    pressure_score: 0.28,
    cloud_base_m: 3200,
    humidity: 58,
    wind_speed: 24,
    inversion_delta: -1.2,
    inversion_present: false,
    pressure_hpa: 1008,
  },
  cloud_layer_viz: buildCloudLayerViz(4808, 3200, [
    { pressure_hpa: 925, altitude_m: 730, relative_humidity: 61, temperature_c: 5.4 },
    { pressure_hpa: 850, altitude_m: 1460, relative_humidity: 55, temperature_c: 1.9 },
    { pressure_hpa: 700, altitude_m: 3010, relative_humidity: 41, temperature_c: -5.1 },
  ]),
});

/** Map peak_id → score mock (utilise high par défaut) */
export function getMockScore(peak_id: string): ScoreResponse {
  if (peak_id === 'peak-mont-blanc') return MOCK_SCORE_LOW;
  if (peak_id === 'peak-grand-veymont') return MOCK_SCORE_MEDIUM;
  return MOCK_SCORE_HIGH;
}
