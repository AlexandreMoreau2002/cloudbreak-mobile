/**
 * scoreConditions — accesseurs partagés sur `ScoreResponse.conditions`.
 *
 * Une seule priorité d'alias : les champs suffixés (`_kmh`, `_pct`, `_c`),
 * ceux que renvoie l'API, passent avant les anciens alias non suffixés.
 */
import type { ScoreResponse } from '@/services/mockData/types';

type Conditions = Partial<ScoreResponse['conditions']> | null | undefined;

export function getWind(c: Conditions): number | null {
  return c?.wind_speed_kmh ?? c?.wind_speed ?? null;
}

export function getHumidity(c: Conditions): number | null {
  return c?.humidity_pct ?? c?.humidity ?? null;
}

export function getInversionDelta(c: Conditions): number | null {
  return c?.inversion_delta_c ?? c?.inversion_delta ?? null;
}

export function getInversionPresent(c: Conditions): boolean | null {
  return c?.inversion_present ?? c?.inversion_detected ?? null;
}
