/**
 * api/peaks — appels sommets et favoris.
 *
 * Usage :
 *   import { searchPeaks, fetchPeakBySlug, fetchFavorites, removeFavorite } from '@/services/api/peaks';
 */
import { MOCK_PEAKS } from '@/services/mockData/peaks';
import { MOCK_API, DEBUG } from '@/constants/devConfig';
import { apiFetch, _delay } from '@/services/fetchService';
import type { Peak, FavoriteResponse } from '@/services/mockData/types';

export async function searchPeaks(token: string, query: string): Promise<Peak[]> {
  if (MOCK_API) {
    if (DEBUG) console.debug('[api/peaks] MOCK searchPeaks', { query });
    await _delay(200);
    const q = query.toLowerCase();
    return MOCK_PEAKS.filter((p) => p.name.toLowerCase().includes(q));
  }
  return apiFetch<Peak[]>('/api/v1/peaks/search', token, { q: query });
}

export async function fetchPeakBySlug(token: string, slug: string): Promise<Peak> {
  if (MOCK_API) {
    if (DEBUG) console.debug('[api/peaks] MOCK fetchPeakBySlug', { slug });
    await _delay(200);
    const peak = MOCK_PEAKS.find((p) => p.slug === slug);
    if (!peak) throw new Error('Peak not found');
    return peak;
  }
  return apiFetch<Peak>(`/api/v1/peaks/${slug}`, token);
}

export async function fetchFavorites(token: string): Promise<FavoriteResponse[]> {
  if (MOCK_API) {
    if (DEBUG) console.debug('[api/peaks] MOCK fetchFavorites');
    await _delay(200);
    return MOCK_PEAKS.slice(0, 2).map((p, i) => ({
      id: `fav-${i}`,
      peak_id: p.id,
      peak: p,
      created_at: new Date().toISOString(),
    }));
  }
  return apiFetch<FavoriteResponse[]>('/api/v1/user/favorites', token);
}

export async function removeFavorite(token: string, peak_id: string): Promise<void> {
  if (MOCK_API) {
    if (DEBUG) console.debug('[api/peaks] MOCK removeFavorite', { peak_id });
    await _delay(100);
    return;
  }
  await apiFetch<void>(`/api/v1/user/favorites/${peak_id}`, token, undefined, { method: 'DELETE' });
}
