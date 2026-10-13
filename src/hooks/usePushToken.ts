/**
 * usePushToken — enregistre le token Expo Push de l'appareil auprès du backend.
 *
 * Monté une fois à la racine (_layout.tsx). N'agit que pour un compte permanent dont la
 * permission iOS est DÉJÀ accordée (la demande se fait à l'onboarding) : aucune invite ici.
 * Le token n'est renvoyé que s'il change pour l'utilisateur courant (un refresh du JWT ne le renvoie pas). La langue de l'app part avec le token ; la changer le renvoie. Jamais bloquant.
 *
 * Usage :
 *   usePushToken(); // dans AppStack, sans destructuring
 */
import Constants from 'expo-constants';
import { AppState } from 'react-native';
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

import { DEBUG } from '@/constants/devConfig';
import { useAuth } from '@/contexts/AuthContext';
import { updatePushToken } from '@/services/api/user';
import { useLanguage } from '@/contexts/LanguageContext';

function resolveProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export function usePushToken(): void {
  const { session, isAnonymous } = useAuth();
  const { locale: appLocale } = useLanguage();
  // Le backend n'accepte que fr | en (422 sinon) : tout autre cas retombe sur fr.
  const locale = appLocale === 'en' ? 'en' : 'fr';
  const userId = session?.user?.id ?? null;
  // Le JWT est renouvelé toutes les heures : on le garde en ref pour ne pas relancer l'effet
  // (et re-POSTer le token) à chaque refresh, ni risquer de ré-attacher le token au logout.
  const accessTokenRef = useRef<string | null>(null);
  const accessToken = session?.access_token ?? null;
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  useEffect(() => {
    if (!userId || isAnonymous) {
      lastSentRef.current = null;
      return;
    }
    let cancelled = false;
    // Garde « en cours » propre à cette identité : un envoi d'une identité précédente ne bloque pas la suivante.
    let inFlight = false;

    async function register() {
      if (inFlight) return;
      inFlight = true;
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') return;
        const { data: pushToken } = await Notifications.getExpoPushTokenAsync({
          projectId: resolveProjectId(),
        });
        const key = `${userId}:${pushToken}:${locale}`;
        const jwt = accessTokenRef.current;
        if (cancelled || !jwt || lastSentRef.current === key) return;
        await updatePushToken(jwt, pushToken, locale);
        // Un POST déjà parti ne peut pas être annulé : on évite au moins de mémoriser la clé
        // d'une identité qui n'est plus la courante.
        if (!cancelled) lastSentRef.current = key;
      } catch (error) {
        // Échec réseau, projectId absent, simulateur : jamais bloquant. La clé n'est pas
        // mémorisée : le prochain retour de l'app au premier plan réessaie.
        /* istanbul ignore next -- diagnostic disponible uniquement dans les builds DEBUG */
        if (DEBUG) console.debug('[usePushToken] registration failed', error);
      } finally {
        inFlight = false;
      }
    }

    void register();
    // Couvre la permission accordée après coup (dialogue système, réglages iOS), un démarrage
    // hors ligne ou un échec réseau : on retente à chaque retour au premier plan.
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void register();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [userId, isAnonymous, locale]);
}
