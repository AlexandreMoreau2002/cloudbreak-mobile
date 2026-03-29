import { fetchScore } from '@/services/api/score';
import { MOCK_SCORE_HIGH, MOCK_SCORE_LOW } from '@/services/mockData/score';

jest.mock('@/utils/i18n', () => ({
  t: (key: string, params?: Record<string, string | number>) => {
    const map: Record<string, string> = {
      'score.label.high': 'Élevée',
      'score.label.medium': 'Moyenne',
      'score.label.low': 'Faible',
      'score.label.none': 'Pas de nuages',
      'score.context.high.stable_window': `Conditions favorables : la base nuageuse reste sous le sommet de ${params?.cloud_base_gap_m} m.`,
    };
    return map[key] ?? key;
  },
}));

const mockDevConfigState = { MOCK_API: false, DEBUG: false };
const mockApiFetch = jest.fn();
const mockDelay = jest.fn((_ms: number) => Promise.resolve());

jest.mock('@/constants/devConfig', () => ({
  get MOCK_API() { return mockDevConfigState.MOCK_API; },
  get DEBUG() { return mockDevConfigState.DEBUG; },
}));

jest.mock('@/services/fetchService', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  _delay: (ms: number) => mockDelay(ms),
}));

describe('api/score', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDevConfigState.MOCK_API = false;
    mockDevConfigState.DEBUG = false;
  });

  it('appelle /api/v1/score avec les paramètres attendus', async () => {
    mockApiFetch.mockResolvedValueOnce(MOCK_SCORE_HIGH);

    const result = await fetchScore('token-123', 'peak-1', '2026-03-23', 8);

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/score', 'token-123', {
      peak_id: 'peak-1',
      date: '2026-03-23',
      hour: '8',
    });
    expect(result).toEqual(MOCK_SCORE_HIGH);
  });

  it('utilise l’heure par défaut à 6', async () => {
    mockApiFetch.mockResolvedValueOnce(MOCK_SCORE_HIGH);

    await fetchScore('token-123', 'peak-1', '2026-03-23');

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/score', 'token-123', {
      peak_id: 'peak-1',
      date: '2026-03-23',
      hour: '6',
    });
  });

  it('retourne le score mock en mode MOCK_API', async () => {
    mockDevConfigState.MOCK_API = true;

    await expect(fetchScore('token-123', 'peak-mont-blanc', '2026-03-23')).resolves.toEqual(
      MOCK_SCORE_LOW,
    );
    expect(mockDelay).toHaveBeenCalledWith(400);
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('normalise un payload backend ancien avec les champs 3.5 manquants', async () => {
    mockApiFetch.mockResolvedValueOnce({
      score: 61,
      verdict: 'medium',
      cloud_base: 1800,
      peak_name: 'Grand Veymont',
      peak_altitude: 2341,
      conditions: {
        cloud_base_score: 0.6,
        humidity_score: 0.55,
        wind_score: 0.7,
        inversion_score: 0.4,
        pressure_score: 0.58,
      },
    });

    const result = await fetchScore('token-123', 'peak-grand-veymont', '2026-03-23');

    expect(result).toMatchObject({
      label: 'Moyenne',
      label_code: null,
      peak_region: null,
      optimal_window_start: null,
      optimal_window_end: null,
      sunrise: null,
      stability_hours: null,
      conditions: {
        cloud_base_score: 0.6,
        humidity: null,
        wind_speed: null,
        inversion_delta: null,
        inversion_present: null,
        pressure_hpa: null,
      },
      cloud_layer_viz: null,
    });
  });

  it('normalise le payload backend 3.5 enrichi', async () => {
    mockApiFetch.mockResolvedValueOnce({
      score: 84,
      verdict: 'high',
      label_code: 'score.label.high',
      cloud_base: 1200,
      peak_name: 'Croix de Chamrousse',
      peak_altitude: 2257,
      peak_region: 'Massif de Belledonne',
      peak_slug: 'croix-de-chamrousse',
      context_code: 'score.context.high.stable_window',
      context_params: { cloud_base_gap_m: 1057 },
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
        humidity_pct: 86,
        wind_speed_kmh: 7,
        inversion_delta_c: 4.8,
        inversion_detected: true,
        pressure_hpa: 1028,
        cloud_cover_low_pct: 74,
      },
      cloud_layer_viz: {
        summit_altitude: 2257,
        cloud_base: 1200,
        pressure_levels: [
          {
            pressure_hpa: 925,
            altitude_m: 730,
            relative_humidity: 92,
            temperature_c: 8.3,
            dew_point_spread: 1.2,
          },
        ],
      },
    });

    const result = await fetchScore('token-123', 'peak-1', '2026-03-23');

    expect(result).toMatchObject({
      label: 'Élevée',
      label_code: 'score.label.high',
      peak_slug: 'croix-de-chamrousse',
      peak_region: 'Massif de Belledonne',
      context_message: 'Conditions favorables : la base nuageuse reste sous le sommet de 1057 m.',
      context_code: 'score.context.high.stable_window',
      optimal_window_start: '06:40',
      optimal_window_end: '08:15',
      sunrise: '07:02',
      stability_hours: 48,
      conditions: {
        humidity: 86,
        humidity_pct: 86,
        wind_speed: 7,
        wind_speed_kmh: 7,
        inversion_delta: 4.8,
        inversion_delta_c: 4.8,
        inversion_present: true,
        inversion_detected: true,
        cloud_cover_low_pct: 74,
      },
      cloud_layer_viz: {
        summit_altitude: 2257,
        cloud_base: 1200,
        pressure_levels: [
          {
            pressure_hpa: 925,
            altitude_m: 730,
            relative_humidity: 92,
            temperature_c: 8.3,
            dew_point_spread: 1.2,
          },
        ],
      },
    });
  });

  it('normalise une cloud layer sans niveaux explicites', async () => {
    mockApiFetch.mockResolvedValueOnce({
      score: 42,
      verdict: 'medium',
      cloud_base: 1500,
      peak_name: 'Test Peak',
      peak_altitude: 2200,
      peak_region: null,
      conditions: {
        cloud_base_score: 0.5,
        humidity_score: 0.5,
        wind_score: 0.5,
        inversion_score: 0.5,
      },
      cloud_layer_viz: {
        summit_altitude: 2200,
        cloud_base: 1500,
      },
    });

    const result = await fetchScore('token-123', 'peak-test', '2026-03-23');
    expect(result.cloud_layer_viz?.pressure_levels).toEqual([]);
  });

  it('applique les valeurs par defaut quand le payload est incomplet', async () => {
    mockApiFetch.mockResolvedValueOnce({
      score: 0,
      cloud_base: 0,
      peak_name: 'Sommet inconnu',
      peak_altitude: 0,
      peak_region: null,
    });

    const result = await fetchScore('token-123', 'peak-unknown', '2026-03-23');

    expect(result).toMatchObject({
      verdict: 'none',
      label: 'Pas de nuages',
      label_code: null,
      conditions: {
        cloud_base_score: 0,
        humidity_score: 0,
        wind_score: 0,
        inversion_score: 0,
        pressure_score: 0,
        cloud_base_m: null,
        humidity: null,
        wind_speed: null,
        inversion_delta: null,
        inversion_present: null,
        pressure_hpa: null,
      },
      cloud_layer_viz: null,
    });
  });

  it('applique les valeurs par defaut quand le payload est vide', async () => {
    mockApiFetch.mockResolvedValueOnce({});

    const result = await fetchScore('token-123', 'peak-unknown', '2026-03-23');

    expect(result).toMatchObject({
      score: 0,
      verdict: 'none',
      label: 'Pas de nuages',
      label_code: null,
      cloud_base: 0,
      peak_name: '',
      peak_altitude: 0,
      peak_region: null,
      conditions: {
        cloud_base_score: 0,
        humidity_score: 0,
        wind_score: 0,
        inversion_score: 0,
        pressure_score: 0,
        cloud_base_m: null,
        humidity: null,
        wind_speed: null,
        inversion_delta: null,
        inversion_present: null,
        pressure_hpa: null,
      },
      cloud_layer_viz: null,
    });
  });

  it('log le fetch mock en mode debug', async () => {
    const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    mockDevConfigState.MOCK_API = true;
    mockDevConfigState.DEBUG = true;

    await fetchScore('token-123', 'peak-1', '2026-03-23', 7);

    expect(consoleSpy).toHaveBeenCalledWith('[api/score] MOCK fetchScore', {
      peak_id: 'peak-1',
      date: '2026-03-23',
      hour: 7,
    });
    consoleSpy.mockRestore();
  });
});
