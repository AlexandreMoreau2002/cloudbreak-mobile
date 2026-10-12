import * as Notifications from 'expo-notifications';
import { Alert, AppState, Linking } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import i18n from '@/utils/i18n';
import { DEBUG } from '@/constants/devConfig';

/**
 * useNotificationPermissionStatus — expose si la permission iOS des notifications
 * a été refusée, et permet d'ouvrir les réglages de l'app pour la réactiver.
 *
 * Lecture seule : n'appelle jamais requestPermissionsAsync (la demande a lieu
 * une seule fois à l'onboarding). Le statut est relu au montage et au retour
 * de l'app au premier plan (l'utilisateur revient des réglages iOS).
 */
export function useNotificationPermissionStatus() {
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        /* istanbul ignore next -- diagnostic disponible uniquement dans les builds DEBUG */
        if (DEBUG) console.debug('[useNotificationPermissionStatus] status', { status });
        if (!cancelled) setDenied(status === 'denied');
      } catch {
        if (!cancelled) setDenied(false);
      }
    }

    void refresh();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void refresh();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  const openSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      /* istanbul ignore next -- diagnostic disponible uniquement dans les builds DEBUG */
      if (DEBUG) console.debug('[useNotificationPermissionStatus] openSettings error', { error });
      Alert.alert(i18n.t('notifications.settingsErrorTitle'), i18n.t('notifications.settingsErrorMessage'));
    }
  }, []);

  return { denied, openSettings };
}
