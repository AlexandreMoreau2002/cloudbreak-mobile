/**
 * Seuils des 4 facteurs « Pourquoi ce score ? ».
 * Seuils d'affichage (distincts des bornes de calcul de backend/app/domain/score_components.py,
 * ex. INVERSION_STRONG = 5) — source unique côté mobile.
 */
import type { ScoreResponse } from '@/services/mockData/types';

export type FactorStatus = 'high' | 'medium' | 'low' | 'unknown';

export const INVERSION_HIGH_C = 3;
export const CLOUDS_GAP_HIGH_M = 150;
export const WIND_HIGH_KMH = 10;
export const WIND_MEDIUM_KMH = 20;
export const HUMIDITY_HIGH_PCT = 85;
export const HUMIDITY_MEDIUM_PCT = 70;

export interface NumericFactor {
  status: FactorStatus;
  value: number | null;
}

export interface CloudsFactor {
  status: FactorStatus;
  cloudBase: number | null;
  summit: number | null;
  gap: number | null;
}

export interface ScoreFactors {
  inversion: NumericFactor;
  clouds: CloudsFactor;
  wind: NumericFactor;
  humidity: NumericFactor;
}

function round1(v: number | null): number | null {
  return v === null ? null : Math.round(v * 10) / 10;
}

function isNum(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function getInversionStatus(delta: number | null | undefined): FactorStatus {
  if (!isNum(delta)) return 'unknown';
  if (delta >= INVERSION_HIGH_C) return 'high';
  return delta > 0 ? 'medium' : 'low';
}

export function getCloudsStatus(gap: number | null | undefined): FactorStatus {
  if (!isNum(gap)) return 'unknown';
  if (gap >= CLOUDS_GAP_HIGH_M) return 'high';
  return gap > 0 ? 'medium' : 'low';
}

export function getWindStatus(kmh: number | null | undefined): FactorStatus {
  if (!isNum(kmh)) return 'unknown';
  if (kmh < WIND_HIGH_KMH) return 'high';
  return kmh < WIND_MEDIUM_KMH ? 'medium' : 'low';
}

export function getHumidityStatus(pct: number | null | undefined): FactorStatus {
  if (!isNum(pct)) return 'unknown';
  if (pct >= HUMIDITY_HIGH_PCT) return 'high';
  return pct >= HUMIDITY_MEDIUM_PCT ? 'medium' : 'low';
}

export function getScoreFactors(score: ScoreResponse): ScoreFactors {
  // `conditions` peut manquer sur des réponses partielles malgré le type.
  const c: Partial<ScoreResponse['conditions']> = score.conditions ?? {};
  // Arrondi à 1 décimale : la valeur affichée et son statut doivent concorder.
  const inversion = round1(c.inversion_delta_c ?? c.inversion_delta ?? null);
  const wind = round1(c.wind_speed_kmh ?? c.wind_speed ?? null);
  const humidity = round1(c.humidity_pct ?? c.humidity ?? null);
  const cloudBase = isNum(score.cloud_base) ? score.cloud_base : null;
  const summit = isNum(score.peak_altitude) ? score.peak_altitude : null;
  const gap = cloudBase !== null && summit !== null ? summit - cloudBase : null;

  return {
    inversion: { status: getInversionStatus(inversion), value: inversion },
    clouds: { status: getCloudsStatus(gap), cloudBase, summit, gap },
    wind: { status: getWindStatus(wind), value: wind },
    humidity: { status: getHumidityStatus(humidity), value: humidity },
  };
}
