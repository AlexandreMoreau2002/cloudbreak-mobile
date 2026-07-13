import i18n from '@/utils/i18n';
import { DEBUG } from '@/constants/devConfig';
import { Alert, Linking } from 'react-native';

/**
 * useLegalLinks — ouvre un lien légal (privacy, CGU, support) dans le
 * navigateur/mail système via Linking.openURL.
 *
 * Le try/catch vit ici (hook) et non dans le composant profile.tsx,
 * conformément à la règle projet "jamais de try/catch dans les composants".
 */
export function useLegalLinks() {
  async function openLegalLink(url: string) {
    try {
      await Linking.openURL(url);
      if (DEBUG) console.debug('[useLegalLinks] openURL success', { url });
    } catch (error) {
      if (DEBUG) console.debug('[useLegalLinks] openURL error', { url, error });
      Alert.alert(i18n.t('legal.errorTitle'), i18n.t('legal.errorMessage'));
    }
  }

  return { openLegalLink };
}
