import React from 'react';
import { UserCard } from './UserCard';
import { render } from '@testing-library/react-native';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      surface: '#F7F5F1',
      border: '#E9E4DA',
      accent: '#B28C6E',
      textPrimary: '#1A1A1A',
      textSecondary: '#5E5E5E',
    },
    typography: { fontFamily: { regular: 'regular', semiBold: 'semiBold' } },
  }),
}));

describe('UserCard', () => {
  it('affiche les initiales depuis l\'email', () => {
    const { getByText } = render(<UserCard email="alex.moreau@test.com" />);
    expect(getByText('AM')).toBeTruthy();
  });

  it('affiche le nom (partie avant @)', () => {
    const { getByText } = render(<UserCard email="alex.moreau@test.com" />);
    expect(getByText('alex.moreau')).toBeTruthy();
  });

  it('affiche l\'email complet', () => {
    const { getByText } = render(<UserCard email="alex.moreau@test.com" />);
    expect(getByText('alex.moreau@test.com')).toBeTruthy();
  });

  it('gère un email sans séparateur dans le nom', () => {
    const { getByText } = render(<UserCard email="alex@test.com" />);
    expect(getByText('A')).toBeTruthy();
  });

  it('gère un email vide sans crash', () => {
    const { toJSON } = render(<UserCard email="" />);
    expect(toJSON()).toBeTruthy();
  });
});
