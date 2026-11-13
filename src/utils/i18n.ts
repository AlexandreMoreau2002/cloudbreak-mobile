import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';

import en from '@/locales/en';
import fr from '@/locales/fr';

const i18n = new I18n({ fr, en });
i18n.locale = getLocales()[0]?.languageCode ?? 'fr';
i18n.defaultLocale = 'fr';
i18n.enableFallback = true;

export default i18n;
