/**
 * useNotificationPermission — demande la permission push iOS.
 *
 * Usage :
 *   const { requestPermission } = useNotificationPermission();
 *   await requestPermission(); // résout toujours, accordée ou non
 */
import { useCallback } from 'react';
import { DEBUG } from '@/constants/devConfig';
import * as Notifications from 'expo-notifications';

export function useNotificationPermission() {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      /* istanbul ignore next -- diagnostic disponible uniquement dans les builds DEBUG */
      if (DEBUG) console.debug('[useNotificationPermission] status', { status });
      return status === 'granted';
    } catch {
      // Refus ou erreur — jamais bloquant (AC 3).
      return false;
    }
  }, []);
  return { requestPermission };
}
