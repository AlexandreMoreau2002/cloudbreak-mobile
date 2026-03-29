import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import i18n from '@/utils/i18n';

type AppLocale = 'fr' | 'en';

interface LanguageContextValue {
  locale: AppLocale;
  toggleLocale: () => void;
}

const DEFAULT_LOCALE: AppLocale = getLocales()[0]?.languageCode === 'en' ? 'en' : 'fr';

function normalizeLocale(value: string | null | undefined): AppLocale {
  return value === 'en' ? 'en' : 'fr';
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<AppLocale>(normalizeLocale(i18n.locale || DEFAULT_LOCALE));

  const toggleLocale = useCallback(() => {
    setLocale((prev) => {
      const next: AppLocale = prev === 'fr' ? 'en' : 'fr';
      i18n.locale = next;
      return next;
    });
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    i18n.locale = locale;
    return { locale, toggleLocale };
  }, [locale, toggleLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
