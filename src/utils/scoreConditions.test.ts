/**
 * scoreConditions — tests unitaires.
 */
import { getHumidity, getInversionDelta, getInversionPresent, getWind } from '@/utils/scoreConditions';

describe('scoreConditions', () => {
  it('priorise les champs suffixés sur les alias', () => {
    const c = {
      wind_speed_kmh: 10,
      wind_speed: 99,
      humidity_pct: 80,
      humidity: 99,
      inversion_delta_c: 4,
      inversion_delta: 99,
      inversion_present: true,
      inversion_detected: false,
    };
    expect(getWind(c)).toBe(10);
    expect(getHumidity(c)).toBe(80);
    expect(getInversionDelta(c)).toBe(4);
    expect(getInversionPresent(c)).toBe(true);
  });

  it('retombe sur les alias non suffixés', () => {
    const c = { wind_speed: 7, humidity: 60, inversion_delta: -1, inversion_detected: false };
    expect(getWind(c)).toBe(7);
    expect(getHumidity(c)).toBe(60);
    expect(getInversionDelta(c)).toBe(-1);
    expect(getInversionPresent(c)).toBe(false);
  });

  it('garde 0 et false (pas de faux fallback)', () => {
    const c = { wind_speed_kmh: 0, wind_speed: 5, inversion_present: false, inversion_detected: true };
    expect(getWind(c)).toBe(0);
    expect(getInversionPresent(c)).toBe(false);
  });

  it('renvoie null si absent ou conditions manquantes', () => {
    expect(getWind({})).toBeNull();
    expect(getHumidity(undefined)).toBeNull();
    expect(getInversionDelta(null)).toBeNull();
    expect(getInversionPresent({ wind_speed_kmh: null })).toBeNull();
  });
});
