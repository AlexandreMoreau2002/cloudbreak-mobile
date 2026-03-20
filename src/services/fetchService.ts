/**
 * fetchService — infrastructure HTTP générique.
 *
 * Ce fichier expose uniquement :
 *   - API_BASE : URL de base de l'API
 *   - apiFetch<T>() : fonction utilitaire HTTP authentifiée
 *   - _delay() : helper mock partagé
 *
 * La logique métier (fetchScore, searchPeaks, etc.) est dans src/services/api/.
 *
 * Usage :
 *   import { apiFetch } from '@/services/fetchService';
 */
import { DEBUG } from '@/constants/devConfig';

// ── Config API ────────────────────────────────────────────────────────────────

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.cloudbreak.fr';

export async function apiFetch<T>(
  path: string,
  token: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  if (DEBUG) console.debug('[fetchService] request', { url: url.toString() });

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.detail ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ── Helper mock ───────────────────────────────────────────────────────────────

export function _delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Réexports de types ────────────────────────────────────────────────────────

export type {
  Peak,
  ScoreResponse,
  MockUser,
  MockSubscription,
  NotificationPreferences,
} from '@/services/mockData/types';
