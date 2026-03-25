import {
  getMockScore,
  MOCK_SCORE_HIGH,
  MOCK_SCORE_LOW,
  MOCK_SCORE_MEDIUM,
} from '@/services/mockData/score';

describe('mockData/score', () => {
  it('expose les champs 3.5 riches sur le score high', () => {
    expect(MOCK_SCORE_HIGH.label).toBe('Fenetre optimale');
    expect(MOCK_SCORE_HIGH.peak_slug).toBe('croix-de-chamrousse');
    expect(MOCK_SCORE_HIGH.optimal_window_start).toBe('06:40');
    expect(MOCK_SCORE_HIGH.sunrise).toBe('07:02');
    expect(MOCK_SCORE_HIGH.stability_hours).toBe(48);
    expect(MOCK_SCORE_HIGH.conditions.humidity).toBe(86);
    expect(MOCK_SCORE_HIGH.cloud_layer_viz?.pressure_levels).toHaveLength(3);
  });

  it('expose un message contextuel sur le score low', () => {
    expect(MOCK_SCORE_LOW.context_message).toContain('Pas de mer de nuage');
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
});
