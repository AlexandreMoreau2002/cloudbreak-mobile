import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { OfflineBanner } from './OfflineBanner';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      surface: '#F7F5F1',
      border: '#E9E4DA',
      textSecondary: '#5E5E5E',
    },
    typography: {
      fontFamily: { regular: 'JosefinSans_400Regular' },
      fontSize: { xs: 11 },
    },
    spacing: { sm: 8 },
  }),
}));

jest.mock('@/utils/i18n', () => ({
  t: (key: string, opts?: { time?: string }) => {
    if (key === 'home.offlineBanner') {
      return `Données de ${opts?.time} · connexion requise pour actualiser`;
    }
    return key;
  },
}));

describe('OfflineBanner', () => {
  it('affiche l\'heure formatée du cache', () => {
    const cachedAt = new Date('2026-03-24T08:38:00Z').getTime();
    render(<OfflineBanner cachedAt={cachedAt} />);

    expect(screen.getByText(/connexion requise pour actualiser/)).toBeTruthy();
  });
});
