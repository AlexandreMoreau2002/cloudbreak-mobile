/**
 * useTerrainValidation — state machine du sheet de validation terrain.
 *
 * Usage :
 *   const terrain = useTerrainValidation({ token, locationPermission });
 *   terrain.open(); // déclenche searching -> ready | denied
 *   terrain.answer(true, { predictionId });
 */
import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import { DEBUG } from '@/constants/devConfig';
import type { LocationPermissionStatus } from '@/contexts/AuthContext';
import { postTerrainValidation } from '@/services/api/validations';

export type TerrainStep = 'searching' | 'ready' | 'denied' | 'success' | null;

interface UseTerrainValidationArgs {
  token: string | null;
  locationPermission: LocationPermissionStatus;
}

interface AnswerContext {
  predictionId: string;
}

export function useTerrainValidation({ token, locationPermission }: UseTerrainValidationArgs) {
  const [step, setStep] = useState<TerrainStep>(null);
  const [noGps, setNoGps] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const open = useCallback(() => {
    if (locationPermission !== 'granted') {
      if (DEBUG) console.debug('[useTerrainValidation] permission refusée -> denied');
      setStep('denied');
      return;
    }

    setStep('searching');
    setNoGps(false);
    Location.getCurrentPositionAsync()
      .then((position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStep('ready');
      })
      .catch(() => {
        if (DEBUG) console.debug('[useTerrainValidation] getCurrentPositionAsync a échoué -> denied');
        setStep('denied');
      });
  }, [locationPermission]);

  const validateManually = useCallback(() => {
    setNoGps(true);
    setCoords(null);
    setStep('ready');
  }, []);

  const answer = useCallback(
    async (result: boolean, ctx: AnswerContext) => {
      if (!token) return;
      if (DEBUG) console.debug('[useTerrainValidation] answer', { result, ctx });
      await postTerrainValidation(token, {
        prediction_id: ctx.predictionId,
        result: result ? 'confirmed' : 'denied',
        lat: coords?.lat,
        lng: coords?.lng,
      });
      setStep('success');
    },
    [token, coords],
  );

  const dismiss = useCallback(() => {
    setStep(null);
    setNoGps(false);
    setCoords(null);
  }, []);

  return { step, noGps, open, validateManually, answer, dismiss };
}
