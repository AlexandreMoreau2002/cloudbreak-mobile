import type { ScoreResponse } from '@/services/mockData/types';
import {
  CLOUDS_GAP_HIGH_M,
  CLOUD_COVER_LOW_GATE_PCT,
  HUMIDITY_HIGH_PCT,
  HUMIDITY_MEDIUM_PCT,
  INVERSION_HIGH_C,
  WIND_HIGH_KMH,
  WIND_MEDIUM_KMH,
  getCloudsStatus,
  getHumidityStatus,
  getInversionStatus,
  getScoreFactors,
  getWindStatus,
} from '@/constants/scoreFactors';

function makeScore(conditions: Partial<ScoreResponse['conditions']> = {}, over: Partial<ScoreResponse> = {}): ScoreResponse {
  return {
    score: 80,
    verdict: 'high',
    cloud_base: 1800,
    peak_name: 'Test',
    peak_altitude: 2000,
    conditions: { cloud_base_score: 1, humidity_score: 1, wind_score: 1, inversion_score: 1, ...conditions },
    ...over,
  };
}

describe('seuils exportés', () => {
  it('sont les seuils d\'affichage mobile (distincts des bornes de calcul backend, ex. INVERSION_STRONG = 5)', () => {
    expect(INVERSION_HIGH_C).toBe(3);
    expect(CLOUDS_GAP_HIGH_M).toBe(150);
    expect(WIND_HIGH_KMH).toBe(10);
    expect(WIND_MEDIUM_KMH).toBe(20);
    expect(HUMIDITY_HIGH_PCT).toBe(85);
    expect(HUMIDITY_MEDIUM_PCT).toBe(70);
    expect(CLOUD_COVER_LOW_GATE_PCT).toBe(45);
  });
});

describe('getInversionStatus', () => {
  it.each([
    [3, 'high'],
    [2.99, 'medium'],
    [0.01, 'medium'],
    [0, 'low'],
    [-2, 'low'],
  ])('delta %p -> %p', (delta, expected) => {
    expect(getInversionStatus(delta)).toBe(expected);
  });
  it('unknown si absent', () => {
    expect(getInversionStatus(null)).toBe('unknown');
    expect(getInversionStatus(undefined)).toBe('unknown');
  });
});

describe('getCloudsStatus', () => {
  it.each([
    [150, 'high'],
    [149, 'medium'],
    [1, 'medium'],
    [0, 'low'],
    [-50, 'low'],
  ])('gap %p -> %p', (gap, expected) => {
    expect(getCloudsStatus(gap)).toBe(expected);
  });
  it('unknown si absent', () => {
    expect(getCloudsStatus(null)).toBe('unknown');
    expect(getCloudsStatus(undefined)).toBe('unknown');
  });
});

describe('getWindStatus', () => {
  it.each([
    [0, 'high'],
    [9.99, 'high'],
    [10, 'medium'],
    [19.99, 'medium'],
    [20, 'low'],
    [45, 'low'],
  ])('vent %p -> %p', (kmh, expected) => {
    expect(getWindStatus(kmh)).toBe(expected);
  });
  it('unknown si absent', () => {
    expect(getWindStatus(null)).toBe('unknown');
    expect(getWindStatus(undefined)).toBe('unknown');
  });
});

describe('getHumidityStatus', () => {
  it.each([
    [85, 'high'],
    [84.9, 'medium'],
    [70, 'medium'],
    [69.9, 'low'],
    [10, 'low'],
  ])('humidité %p -> %p', (pct, expected) => {
    expect(getHumidityStatus(pct)).toBe(expected);
  });
  it('unknown si absent', () => {
    expect(getHumidityStatus(null)).toBe('unknown');
    expect(getHumidityStatus(undefined)).toBe('unknown');
  });
});

describe('getScoreFactors', () => {
  it('calcule le statut sur la valeur arrondie affichée', () => {
    const f = getScoreFactors(makeScore({ inversion_delta_c: 2.96, wind_speed_kmh: 9.96, humidity_pct: 84.96 }));
    expect(f.inversion).toEqual({ status: 'high', value: 3 });
    expect(f.wind).toEqual({ status: 'medium', value: 10 });
    expect(f.humidity).toEqual({ status: 'high', value: 85 });
  });

  it('calcule les 4 facteurs à partir des champs préférés (_c, _kmh, _pct)', () => {
    const f = getScoreFactors(
      makeScore({ inversion_delta_c: 6, wind_speed_kmh: 12, humidity_pct: 94, inversion_delta: 1, wind_speed: 30, humidity: 10 }),
    );
    expect(f.inversion).toEqual({ status: 'high', value: 6 });
    expect(f.clouds).toEqual({ status: 'high', cloudBase: 1800, summit: 2000, gap: 200 });
    expect(f.wind).toEqual({ status: 'medium', value: 12 });
    expect(f.humidity).toEqual({ status: 'high', value: 94 });
  });

  it('retombe sur les champs historiques', () => {
    const f = getScoreFactors(makeScore({ inversion_delta: -1, wind_speed: 25, humidity: 50 }));
    expect(f.inversion.status).toBe('low');
    expect(f.wind.status).toBe('low');
    expect(f.humidity.status).toBe('low');
  });

  it('retourne unknown quand les données manquent', () => {
    const f = getScoreFactors(makeScore());
    expect(f.inversion).toEqual({ status: 'unknown', value: null });
    expect(f.wind).toEqual({ status: 'unknown', value: null });
    expect(f.humidity).toEqual({ status: 'unknown', value: null });
  });

  it('nuages low quand la base dépasse le sommet', () => {
    const f = getScoreFactors(makeScore({}, { cloud_base: 2500 }));
    expect(f.clouds.status).toBe('low');
    expect(f.clouds.gap).toBe(-500);
  });

  it('nuages unknown si cloud_base ou altitude non numériques', () => {
    const f = getScoreFactors(makeScore({}, { cloud_base: undefined as unknown as number }));
    expect(f.clouds).toEqual({ status: 'unknown', cloudBase: null, summit: 2000, gap: null });
  });

  it('tolère une réponse sans conditions', () => {
    const score = { ...makeScore(), conditions: undefined } as unknown as ScoreResponse;
    const f = getScoreFactors(score);
    expect(f.inversion.status).toBe('unknown');
    expect(f.clouds.status).toBe('high');
  });
});

describe('getScoreFactors — hard gate nuages bas', () => {
  const none = { verdict: 'none' as const, score: 0 };

  it('actif si verdict none, nuages bas < 45 et base sous le sommet', () => {
    const f = getScoreFactors(makeScore({ cloud_cover_low_pct: 30 }, none));
    expect(f.lowCloudGate).toBe(true);
    expect(f.cloudCoverLowPct).toBe(30);
  });

  it('inactif si cloud_cover_low_pct absent ou non numérique', () => {
    expect(getScoreFactors(makeScore({}, none)).lowCloudGate).toBe(false);
    expect(getScoreFactors(makeScore({ cloud_cover_low_pct: null }, none)).lowCloudGate).toBe(false);
  });

  it('inactif à 45 % et au-dessus (seuil exclusif)', () => {
    expect(getScoreFactors(makeScore({ cloud_cover_low_pct: 45 }, none)).lowCloudGate).toBe(false);
    expect(getScoreFactors(makeScore({ cloud_cover_low_pct: 80 }, none)).lowCloudGate).toBe(false);
  });

  it('inactif si le verdict n\'est pas none', () => {
    expect(getScoreFactors(makeScore({ cloud_cover_low_pct: 10 }, { verdict: 'low' })).lowCloudGate).toBe(false);
  });

  it('inactif si la base des nuages est déjà au niveau ou au-dessus du sommet', () => {
    expect(getScoreFactors(makeScore({ cloud_cover_low_pct: 10 }, { ...none, cloud_base: 2000 })).lowCloudGate).toBe(false);
    expect(getScoreFactors(makeScore({ cloud_cover_low_pct: 10 }, { ...none, cloud_base: 2500 })).lowCloudGate).toBe(false);
  });
});

describe('getScoreFactors — debug', () => {
  it('logue en mode DEBUG', () => {
    jest.resetModules();
    jest.doMock('@/constants/devConfig', () => ({ DEBUG: true }));
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/constants/scoreFactors') as typeof import('@/constants/scoreFactors');
    mod.getScoreFactors(makeScore());
    expect(spy).toHaveBeenCalledWith('[scoreFactors]', expect.any(Object));
    spy.mockRestore();
    jest.dontMock('@/constants/devConfig');
  });
});
