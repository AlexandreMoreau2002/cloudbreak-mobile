import i18n from '@/utils/i18n';
import { track } from '@/services/analytics';
import { DEBUG } from '@/constants/devConfig';
import { Alert, Linking } from 'react-native';

/**
 * useLocationSettingsLink — ouvre les réglages iOS de l'app (AC 3) pour que
 * l'utilisateur puisse activer la géolocalisation après un refus initial.
 *
 * Le try/catch vit ici (hook) et non dans le composant profile.tsx,
 * conformément à la règle projet "jamais de try/catch dans les composants".
 */
export function useLocationSettingsLink() {
  async function openLocationSettings() {
    track('location_settings_opened');
    try {
      await Linking.openSettings();
      /* istanbul ignore next -- diagnostic disponible uniquement dans les builds DEBUG */
      if (DEBUG) console.debug('[useLocationSettingsLink] openSettings success');
    } catch (error) {
      /* istanbul ignore next -- diagnostic disponible uniquement dans les builds DEBUG */
      if (DEBUG) console.debug('[useLocationSettingsLink] openSettings error', { error });
      Alert.alert(i18n.t('profile.locationSettingsErrorTitle'), i18n.t('profile.locationSettingsErrorMessage'));
    }
  }

  return { openLocationSettings };
}
