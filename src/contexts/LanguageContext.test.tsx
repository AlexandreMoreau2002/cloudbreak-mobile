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

  it('utilise DEFAULT_LOCALE quand i18n.locale est vide', () => {
    const originalLocale = i18n.locale;
    i18n.locale = '';

    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    expect(screen.getAllByText('fr')).toHaveLength(2);

    i18n.locale = originalLocale;
  });

  it('utilise i18n.locale quand elle vaut en', () => {
    const originalLocale = i18n.locale;
    i18n.locale = 'en';

    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    expect(screen.getAllByText('en')).toHaveLength(2);

    i18n.locale = originalLocale;
  });

  it('retombe sur DEFAULT_LOCALE dans un module fraichement charge quand i18n.locale est vide', () => {
    jest.resetModules();

    const mockI18n = { locale: '' };

    jest.doMock('expo-localization', () => ({
      getLocales: () => [{ languageCode: 'fr' }],
    }));

    jest.doMock('@/utils/i18n', () => ({
      __esModule: true,
      default: mockI18n,
    }));

    const ReactLocal = jest.requireActual('react') as typeof React;
    const TestRenderer = jest.requireActual('react-test-renderer') as {
      create: (element: React.ReactElement) => unknown;
      act: (callback: () => void) => void;
    };
    const { Text: TextLocal } = jest.requireActual('react-native') as typeof import('react-native');
    const {
      LanguageProvider: LanguageProviderLocal,
      useLanguage: useLanguageLocal,
    } = jest.requireActual('@/contexts/LanguageContext') as typeof import('@/contexts/LanguageContext');

    function ProbeLocal() {
      const { locale } = useLanguageLocal();
      return (
        <>
          <TextLocal>{locale}</TextLocal>
          <TextLocal>{mockI18n.locale}</TextLocal>
        </>
      );
    }

    let tree: {
      root: {
        findAll: (predicate: (node: { type: unknown; props: { children?: unknown } }) => boolean) => { props: { children?: unknown } }[];
      };
    };
    TestRenderer.act(() => {
      tree = TestRenderer.create(
        ReactLocal.createElement(LanguageProviderLocal, null, ReactLocal.createElement(ProbeLocal)),
      ) as typeof tree;
    });

    const textValues = () =>
      tree!
        .root.findAll((node: { type: unknown }) => node.type === TextLocal)
        .flatMap((node: { props: { children?: unknown } }) => {
          const children = node.props.children;
          return Array.isArray(children) ? children : [children];
        })
        .filter((value: unknown): value is string => typeof value === 'string');

    expect(textValues().filter((value: string) => value === 'fr')).toHaveLength(2);
  });

  it('prend en comme locale par défaut quand le device est en et rebascule vers fr', () => {
    jest.resetModules();

    const mockI18n = { locale: 'en' };

    jest.doMock('expo-localization', () => ({
      getLocales: () => [{ languageCode: 'en' }],
    }));

    jest.doMock('@/utils/i18n', () => ({
      __esModule: true,
      default: mockI18n,
    }));

    const ReactLocal = jest.requireActual('react') as typeof React;
    const TestRenderer = jest.requireActual('react-test-renderer') as {
      create: (element: React.ReactElement) => unknown;
      act: (callback: () => void) => void;
    };
    const { Text: TextLocal, Pressable: PressableLocal } =
      jest.requireActual('react-native') as typeof import('react-native');
    const {
      LanguageProvider: LanguageProviderLocal,
      useLanguage: useLanguageLocal,
    } = jest.requireActual('@/contexts/LanguageContext') as typeof import('@/contexts/LanguageContext');

    function ProbeLocal() {
      const { locale, toggleLocale } = useLanguageLocal();
      return (
        <>
          <TextLocal>{locale}</TextLocal>
          <TextLocal>{mockI18n.locale}</TextLocal>
          <PressableLocal accessibilityLabel="toggle-locale-local" onPress={toggleLocale}>
            <TextLocal>toggle</TextLocal>
          </PressableLocal>
        </>
      );
    }

    let tree: {
      root: {
        findAll: (predicate: (node: { type: unknown; props: { children?: unknown } }) => boolean) => { props: { children?: unknown } }[];
        findByProps: (_props: { accessibilityLabel: string }) => { props: { onPress: () => void } };
      };
    };
    TestRenderer.act(() => {
      tree = TestRenderer.create(
        ReactLocal.createElement(LanguageProviderLocal, null, ReactLocal.createElement(ProbeLocal)),
      ) as typeof tree;
    });

    const textValues = () =>
      tree!
        .root.findAll((node: { type: unknown }) => node.type === TextLocal)
        .flatMap((node: { props: { children?: unknown } }) => {
          const children = node.props.children;
          return Array.isArray(children) ? children : [children];
        })
        .filter((value: unknown): value is string => typeof value === 'string');

    expect(textValues().filter((value: string) => value === 'en')).toHaveLength(2);

    TestRenderer.act(() => {
      tree!.root.findByProps({ accessibilityLabel: 'toggle-locale-local' }).props.onPress();
    });

    expect(textValues().filter((value: string) => value === 'fr')).toHaveLength(2);
  });
});
