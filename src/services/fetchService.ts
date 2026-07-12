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
import { DEBUG, SIMULATE_DELAY_MS } from '@/constants/devConfig';

// ── Config API ────────────────────────────────────────────────────────────────

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.cloudbreak.fr';

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiFetch<T>(
  path: string,
  token: string,
  params?: Record<string, string>,
  options?: ApiFetchOptions,
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const method = options?.method ?? 'GET';
  if (DEBUG) console.debug('[fetchService] request', { method, url: url.toString() });

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (options?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      signal: options?.signal,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (cause) {
    if (DEBUG) console.debug('[fetchService] network unreachable', { url: url.toString(), cause });
    const err = new Error('Impossible de joindre le serveur') as Error & { code: string };
    err.code = 'NETWORK_UNREACHABLE';
    throw err;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const code: string | undefined = body?.code ?? (typeof body?.detail === 'object' ? body?.detail?.code : undefined);
    const detail: string = (typeof body?.detail === 'string' ? body.detail : body?.detail?.detail) ?? `HTTP ${response.status}`;
    const err = new Error(detail);
    (err as Error & { code?: string; httpStatus: number }).httpStatus = response.status;
    if (code) (err as Error & { code: string }).code = code;
    throw err;
  }

  if (SIMULATE_DELAY_MS > 0) await _delay(SIMULATE_DELAY_MS);

  if (response.status === 204) return undefined as T;

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
  FavoriteResponse,
} from '@/services/mockData/types';
