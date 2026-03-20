/**
 * api/peaks — appels sommets.
 *
 * Usage :
 *   import { searchPeaks, fetchPeakBySlug } from '@/services/api/peaks';
 */
import { MOCK_API, DEBUG } from '@/constants/devConfig';
import { MOCK_PEAKS } from '@/services/mockData/peaks';
import { apiFetch, _delay } from '@/services/fetchService';
import type { Peak } from '@/services/mockData/types';

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
