/**
 * api/validations — soumission de validation terrain.
 *
 * Usage :
 *   import { postTerrainValidation } from '@/services/api/validations';
 */
import { MOCK_API, DEBUG } from '@/constants/devConfig';
import { apiFetch, _delay } from '@/services/fetchService';

export interface TerrainValidationPayload {
  prediction_id: string;
  result: 'confirmed' | 'denied';
  lat?: number;
  lng?: number;
  photo_url?: string;
}

export async function postTerrainValidation(
  token: string,
  payload: TerrainValidationPayload,
): Promise<void> {
  if (MOCK_API) {
    if (DEBUG) console.debug('[api/validations] MOCK postTerrainValidation', payload);
    await _delay(300);
    return;
  }
  await apiFetch<void>('/api/v1/validations', token, undefined, {
    method: 'POST',
    body: {
      prediction_id: payload.prediction_id,
      result: payload.result === 'confirmed',
      lat: payload.lat,
      lng: payload.lng,
    },
  });
}
