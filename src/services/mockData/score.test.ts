import {
  getMockScore,
  MOCK_SCORE_HIGH,
  MOCK_SCORE_LOW,
  MOCK_SCORE_MEDIUM,
} from '@/services/mockData/score';

describe('mockData/score', () => {
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
