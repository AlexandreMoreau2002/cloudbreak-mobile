/**
 * usePushToken — enregistre le token Expo Push de l'appareil auprès du backend.
 *
 * Monté une fois à la racine (_layout.tsx). N'agit que pour un compte permanent dont la
 * permission iOS est DÉJÀ accordée (la demande se fait à l'onboarding) : aucune invite ici.
 * Le token n'est renvoyé que s'il change pour la session courante. Jamais bloquant.
 *
 * Usage :
 *   usePushToken(); // dans AppStack, sans destructuring
 */
import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

import { DEBUG } from '@/constants/devConfig';
import { useAuth } from '@/contexts/AuthContext';
import { updatePushToken } from '@/services/api/user';

function resolveProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export function usePushToken(): void {
  const { session, isAnonymous } = useAuth();
  const accessToken = session?.access_token ?? null;
  const anonymous = isAnonymous || session?.user?.is_anonymous === true;
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!accessToken || anonymous) {
      lastSentRef.current = null;
      return;
    }
    let cancelled = false;

    async function register() {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') return;
        const { data: pushToken } = await Notifications.getExpoPushTokenAsync({
          projectId: resolveProjectId(),
        });
        const key = `${accessToken}:${pushToken}`;
        if (cancelled || lastSentRef.current === key) return;
        await updatePushToken(accessToken as string, pushToken);
        lastSentRef.current = key;
      } catch (error) {
        // Échec réseau, projectId absent, simulateur : jamais bloquant, réessayé au prochain montage.
        /* istanbul ignore next -- diagnostic disponible uniquement dans les builds DEBUG */
        if (DEBUG) console.debug('[usePushToken] registration failed', error);
      }
    }

    void register();
    return () => {
      cancelled = true;
    };
  }, [accessToken, anonymous]);
}
