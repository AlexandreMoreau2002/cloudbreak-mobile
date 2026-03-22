import React from 'react';
import { render } from '@testing-library/react-native';
import FavoritesScreen from './favorites';

let mockState: { status: string; data?: unknown[]; error?: string } = {
  status: 'success',
  data: [],
};

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    state: mockState,
    removeFavorite: jest.fn(),
    refresh: jest.fn(),
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

describe('FavoritesScreen', () => {
  beforeEach(() => {
    mockState = { status: 'success', data: [] };
  });

  it('affiche l\'état vide quand aucun favori', () => {
    const { getByText } = render(<FavoritesScreen />);
    expect(getByText('favorites.empty')).toBeTruthy();
  });

  it('affiche le spinner en état loading', () => {
    mockState = { status: 'loading' };
    const { queryByText } = render(<FavoritesScreen />);
    expect(queryByText('favorites.empty')).toBeNull();
  });

  it('affiche les favoris quand data présente', () => {
    mockState = {
      status: 'success',
      data: [{ id: '1', name: 'Mont Blanc', slug: 'mont-blanc', lat: 0, lng: 0, altitude: 4807 }],
    };
    const { getByText } = render(<FavoritesScreen />);
    expect(getByText('Mont Blanc')).toBeTruthy();
  });
});
