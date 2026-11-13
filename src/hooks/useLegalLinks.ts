import i18n from '@/utils/i18n';
import { track } from '@/services/analytics';
import { DEBUG } from '@/constants/devConfig';
import { Alert, Linking } from 'react-native';
import { LEGAL_URLS } from '@/constants/legalUrls';

function getLinkType(url: string): 'privacy' | 'cgu' | 'support' | 'other' {
  if (url === LEGAL_URLS.privacy) return 'privacy';
  if (url === LEGAL_URLS.cgu) return 'cgu';
  if (url === LEGAL_URLS.support) return 'support';
  return 'other';
}

/**
 * useLegalLinks — ouvre un lien légal (privacy, CGU, support) dans le
 * navigateur/mail système via Linking.openURL.
 *
 * Le try/catch vit ici (hook) et non dans le composant profile.tsx,
 * conformément à la règle projet "jamais de try/catch dans les composants".
 */
export function useLegalLinks() {
  async function openLegalLink(url: string) {
    track('legal_link_opened', { link_type: getLinkType(url) });
    try {
      await Linking.openURL(url);
      /* istanbul ignore next -- diagnostic disponible uniquement dans les builds DEBUG */
      if (DEBUG) console.debug('[useLegalLinks] openURL success', { url });
    } catch (error) {
      /* istanbul ignore next -- diagnostic disponible uniquement dans les builds DEBUG */
      if (DEBUG) console.debug('[useLegalLinks] openURL error', { url, error });
      Alert.alert(i18n.t('legal.errorTitle'), i18n.t('legal.errorMessage'));
    }
  }

  return { openLegalLink };
}
