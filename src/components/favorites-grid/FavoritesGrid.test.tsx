import React from 'react';
import { FavoritesGrid } from '@/components/favorites-grid';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@/utils/i18n', () => ({
  t: (key: string) => (key === 'home.sectionFavorites' ? 'Favoris' : key),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textPrimary: '#111',
      textSecondary: '#666',
      surface: '#fff',
      border: '#ddd',
    },
    typography: {
      fontFamily: { semiBold: 'semiBold', regular: 'regular' },
      fontSize: { xs: 12, sm: 14 },
    },
  }),
}));

const favorites = [
  { id: 'peak-1', name: 'Mont Blanc', slug: 'mont-blanc', lat: 45, lng: 6, altitude: 4807, region: 'Massif du Mont-Blanc' },
  { id: 'peak-2', name: 'Moucherotte', slug: 'moucherotte', lat: 45, lng: 5, altitude: 1901, region: 'Massif du Vercors' },
];

describe('FavoritesGrid', () => {
  it('ne rend rien si la liste est vide', () => {
    const { toJSON } = render(<FavoritesGrid favorites={[]} onSelectPeak={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it('affiche les favoris et déclenche la sélection', () => {
    const onSelectPeak = jest.fn();
    render(<FavoritesGrid favorites={favorites} onSelectPeak={onSelectPeak} />);
    expect(screen.getByText('FAVORIS')).toBeTruthy();
    expect(screen.getByText('Mont Blanc')).toBeTruthy();
    fireEvent.press(screen.getByTestId('favorite-peak-peak-2'));
    expect(onSelectPeak).toHaveBeenCalledWith(favorites[1]);
  });
});
