import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PeakHeader } from '@/components/PeakHeader';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      surface: '#F7F5F1',
      border: '#E9E4DA',
      accent: '#B28C6E',
      textPrimary: '#1A1A1A',
      textSecondary: '#5E5E5E',
    },
    typography: {
      fontFamily: { regular: 'Josefin Sans', bold: 'Josefin Sans' },
      fontSize: { sm: 14, lg: 20 },
    },
  }),
}));

const peak = {
  id: 'peak-1',
  name: 'Mont Blanc',
  slug: 'mont-blanc',
  lat: 45.8326,
  lng: 6.8652,
  altitude: 4808,
};

describe('PeakHeader', () => {
  it('affiche le nom et l altitude du sommet', () => {
    render(
      <PeakHeader
        peak={peak}
        starred={false}
        onToggleFavorite={jest.fn()}
        onShare={jest.fn()}
      />,
    );

    expect(screen.getByText('Mont Blanc')).toBeTruthy();
    expect(screen.getByText('4808 m')).toBeTruthy();
  });

  it('declenche les callbacks favoris et partage', () => {
    const onToggleFavorite = jest.fn();
    const onShare = jest.fn();

    render(
      <PeakHeader
        peak={peak}
        starred
        onToggleFavorite={onToggleFavorite}
        onShare={onShare}
      />,
    );

    fireEvent.press(screen.getByTestId('favorite-toggle-button'));
    fireEvent.press(screen.getByTestId('share-button'));

    expect(onToggleFavorite).toHaveBeenCalledWith('peak-1');
    expect(onShare).toHaveBeenCalledWith('mont-blanc');
  });
});
