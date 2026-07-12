import { getLocales } from 'expo-localization';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const mockGetLocales = getLocales as jest.Mock;

describe('i18n', () => {
  it('utilise la locale du système quand disponible', () => {
    mockGetLocales.mockReturnValue([{ languageCode: 'en' }]);
    let i18n: any;
    jest.isolateModules(() => {
      i18n = require('@/utils/i18n').default;
    });
    expect(i18n.locale).toBe('en');
  });

  it('utilise fr par défaut si aucune locale système', () => {
    mockGetLocales.mockReturnValue([]);
    let i18n: any;
    jest.isolateModules(() => {
      i18n = require('@/utils/i18n').default;
    });
    expect(i18n.locale).toBe('fr');
  });
});
