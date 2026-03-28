import React from 'react';
import i18n from '@/utils/i18n';
import { Text, Pressable } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'fr' }],
}));

function Probe() {
  const { locale, toggleLocale } = useLanguage();
  return (
    <>
      <Text>{locale}</Text>
      <Text>{i18n.locale}</Text>
      <Pressable accessibilityLabel="toggle-locale" onPress={toggleLocale}>
        <Text>toggle</Text>
      </Pressable>
    </>
  );
}

describe('LanguageContext', () => {
  it('fournit fr par défaut et synchronise i18n.locale', () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    expect(screen.getAllByText('fr')).toHaveLength(2);
  });

  it('bascule vers en puis remet i18n.locale à jour', () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    fireEvent.press(screen.getByLabelText('toggle-locale'));

    expect(screen.getAllByText('en')).toHaveLength(2);
  });

  it('lance une erreur hors provider', () => {
    expect(() => render(<Probe />)).toThrow('useLanguage must be used within LanguageProvider');
  });
});
