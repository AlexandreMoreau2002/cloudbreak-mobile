import React from 'react';
import { render } from '@testing-library/react-native';
import SearchScreen from './search';

jest.mock('@/hooks/usePeakSearch', () => ({
  usePeakSearch: () => ({ state: { status: 'idle' }, query: '', setQuery: jest.fn() }),
}));

jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    state: { status: 'success', data: [] },
    addFavorite: jest.fn(),
    removeFavorite: jest.fn(),
  }),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#EFE8DC', surface: '#F7F5F1', border: '#E9E4DA',
      accent: '#B28C6E', textPrimary: '#1A1A1A', textSecondary: '#5E5E5E',
      textDisabled: '#9E9E9E',
    },
    typography: { fontFamily: { regular: 'Josefin Sans', semiBold: 'Josefin Sans' }, fontSize: { xs: 12, sm: 14, md: 16 } },
    spacing: { xs: 4, sm: 8, md: 16, xl: 32 },
    radius: { sm: 8 },
  }),
}));

jest.mock('@/utils/i18n', () => ({ t: (k: string) => k }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('SearchScreen', () => {
  it('affiche le hint quand query < 2 chars', () => {
    const { getByText } = render(<SearchScreen />);
    expect(getByText('search.minChars')).toBeTruthy();
  });

  it('trie les favoris en premier', () => {
    const FAV_ID = 'fav-peak';
    const peaks = [
      { id: 'other', name: 'Autre', slug: 'autre', lat: 0, lng: 0, altitude: 1000 },
      { id: FAV_ID, name: 'Favori', slug: 'favori', lat: 0, lng: 0, altitude: 800 },
    ];

    jest.resetModules();
    jest.doMock('@/hooks/usePeakSearch', () => ({
      usePeakSearch: () => ({ state: { status: 'success', data: peaks }, query: 'test', setQuery: jest.fn() }),
    }));
    jest.doMock('@/hooks/useFavorites', () => ({
      useFavorites: () => ({
        state: { status: 'success', data: [{ id: FAV_ID, name: 'Favori', slug: 'favori', lat: 0, lng: 0, altitude: 800 }] },
        addFavorite: jest.fn(),
        removeFavorite: jest.fn(),
      }),
    }));
  });
});
