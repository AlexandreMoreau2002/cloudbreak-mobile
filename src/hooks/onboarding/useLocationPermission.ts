/**
 * useLocationPermission — demande la permission foreground géoloc iOS.
 *
 * Usage :
 *   const { requestPermission } = useLocationPermission();
 *   await requestPermission(); // résout toujours, accordée ou non
 */
import { useCallback } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '@/contexts/AuthContext';
import { DEBUG } from '@/constants/devConfig';

export function useLocationPermission() {
  const { setLocationPermission } = useAuth();

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      /* istanbul ignore next -- diagnostic disponible uniquement dans les builds DEBUG */
      if (DEBUG) console.debug('[useLocationPermission] status', { status });
      const granted = status === 'granted';
      setLocationPermission(granted ? 'granted' : 'denied');
      return granted;
    } catch {
      // Refus ou erreur — jamais bloquant (AC 2/AC 4).
      setLocationPermission('denied');
      return false;
    }
  }, [setLocationPermission]);

  return { requestPermission };
}
