import {
  getMockScore,
  MOCK_SCORE_HIGH,
  MOCK_SCORE_LOW,
  MOCK_SCORE_MEDIUM,
  localizeScoreResponse,
  normalizeScoreResponse,
} from '@/services/mockData/score';

function mockDefaultTranslate(key: string, params?: Record<string, string | number>): string {
  const map: Record<string, string> = {
    'score.label.high': 'Élevée',
    'score.label.medium': 'Moyenne',
    'score.label.low': 'Faible',
    'score.label.none': 'Pas de nuages',
    'score.context.low.sunny_clear': `Pas de nuages, ciel parfaitement dégagé au-dessus de ${params?.clear_sky_altitude_m} m ☀️`,
  };
  return map[key] ?? key;
}

let mockTranslateImpl = mockDefaultTranslate;

jest.mock('@/utils/i18n', () => ({
  t: (key: string, params?: Record<string, string | number>) =>
    (typeof mockTranslateImpl === 'function' ? mockTranslateImpl : mockDefaultTranslate)(key, params),
}));

describe('mockData/score', () => {
  beforeEach(() => {
    mockTranslateImpl = mockDefaultTranslate;
  });

  it('expose les champs 3.5 riches sur le score high', () => {
    expect(MOCK_SCORE_HIGH.label_code).toBe('score.label.high');
    expect(MOCK_SCORE_HIGH.label).toBe('Élevée');
    expect(MOCK_SCORE_HIGH.peak_slug).toBe('croix-de-chamrousse');
    expect(MOCK_SCORE_HIGH.optimal_window_start).toBe('06:40');
    expect(MOCK_SCORE_HIGH.sunrise).toBe('07:02');
    expect(MOCK_SCORE_HIGH.stability_hours).toBe(48);
    expect(MOCK_SCORE_HIGH.conditions.humidity).toBe(86);
    expect(MOCK_SCORE_HIGH.cloud_layer_viz?.pressure_levels).toHaveLength(3);
  });

  it('expose un message contextuel sur le score low', () => {
    expect(MOCK_SCORE_LOW.context_code).toBe('score.context.low.sunny_clear');
    expect(MOCK_SCORE_LOW.context_message).toContain('Pas de nuages');
  });

  it('retourne le score low pour Mont Blanc', () => {
    expect(getMockScore('peak-mont-blanc')).toEqual(MOCK_SCORE_LOW);
  });

  it('retourne le score medium pour Grand Veymont', () => {
    expect(getMockScore('peak-grand-veymont')).toEqual(MOCK_SCORE_MEDIUM);
  });

  it('retourne le score high par défaut', () => {
    expect(getMockScore('peak-other')).toEqual(MOCK_SCORE_HIGH);
  });

  it('retourne le libellé par défaut quand aucune traduction nest disponible', () => {
    mockTranslateImpl = (key: string) => key;

    expect(
      normalizeScoreResponse({
        verdict: 'medium',
        label_code: 'score.label.custom_missing',
        score: 51,
        cloud_base: 1800,
        peak_name: 'Test',
        peak_altitude: 1234,
        conditions: {
          cloud_base_score: 0,
          humidity_score: 0,
          wind_score: 0,
          inversion_score: 0,
        },
      }).label,
    ).toBe('Moyenne');

    expect(localizeScoreResponse(MOCK_SCORE_MEDIUM).label).toBe('Moyenne');
  });
});
