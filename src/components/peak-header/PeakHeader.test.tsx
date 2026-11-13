import React from 'react';
import { PeakHeader } from '@/components/peak-header';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textPrimary: '#111',
      textSecondary: '#666',
      surface: '#fff',
      border: '#ddd',
      accent: '#b28c6e',
    },
    typography: {
      fontFamily: { bold: 'bold', regular: 'regular' },
      fontSize: { lg: 22, sm: 14 },
    },
  }),
}));

const peak = {
  id: 'peak-1',
  name: 'Mont Blanc',
  slug: 'mont-blanc',
  lat: 45,
  lng: 6,
  altitude: 4807,
  region: 'Massif du Mont-Blanc',
};

describe('PeakHeader', () => {
  it('affiche le nom et altitude region', () => {
    render(<PeakHeader peak={peak} isFavorite={false} onToggleFavorite={jest.fn()} />);
    expect(screen.getByText('Mont Blanc')).toBeTruthy();
    expect(screen.getByText('4807 m · Massif du Mont-Blanc')).toBeTruthy();
  });

  it('affiche altitude sans region quand region est absent', () => {
    const peakWithoutRegion = { ...peak, region: undefined };
    render(<PeakHeader peak={peakWithoutRegion} isFavorite={false} onToggleFavorite={jest.fn()} />);
    expect(screen.getByText('Mont Blanc')).toBeTruthy();
    expect(screen.getByText('4807 m')).toBeTruthy();
  });

  it('déclenche le toggle favori', () => {
    const onToggleFavorite = jest.fn();
    render(<PeakHeader peak={peak} isFavorite onToggleFavorite={onToggleFavorite} />);
    fireEvent.press(screen.getByTestId('favorite-toggle-button'));
    expect(onToggleFavorite).toHaveBeenCalledWith('peak-1');
  });

  it('affiche le bouton share et appelle onShare avec le slug', () => {
    const onShare = jest.fn();
    render(<PeakHeader peak={peak} isFavorite={false} onToggleFavorite={jest.fn()} onShare={onShare} />);
    const shareBtn = screen.getByTestId('share-button');
    expect(shareBtn).toBeTruthy();
    fireEvent.press(shareBtn);
    expect(onShare).toHaveBeenCalledWith('mont-blanc');
  });
});
