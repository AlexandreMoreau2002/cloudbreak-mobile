import React from 'react';
import { render } from '@testing-library/react-native';

import { UserCard } from '@/components/profile/UserCard';

jest.mock('@/utils/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

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
  it('affiche les initiales depuis le nom choisi', () => {
    const { getByText } = render(<UserCard email="private@test.com" displayName="Alex Moreau" />);
    expect(getByText('AM')).toBeTruthy();
  });

  it('affiche le nom fourni', () => {
    const { getByText } = render(<UserCard email="private@test.com" displayName="Alex Moreau" />);
    expect(getByText('Alex Moreau')).toBeTruthy();
  });

  it('préserve une initiale astrale et un nom de 25 caractères Unicode', () => {
    const { getByText } = render(<UserCard email="private@test.com" displayName="🌄ABCDEFGHIJKLMNOPQRSTUVWX" />);
    expect(getByText('🌄')).toBeTruthy();
    expect(getByText('🌄ABCDEFGHIJKLMNOPQRSTUVWX')).toBeTruthy();
  });

  it('affiche l\'email complet', () => {
    const { getByText } = render(<UserCard email="alex.moreau@test.com" displayName={null} />);
    expect(getByText('alex.moreau@test.com')).toBeTruthy();
  });

  it('utilise une identité et un avatar neutres sans dériver de l’email', () => {
    const { getByText, queryByText } = render(<UserCard email="alex.moreau@test.com" displayName={null} />);
    expect(getByText('profile.displayName.fallback')).toBeTruthy();
    expect(queryByText('alex.moreau')).toBeNull();
    expect(queryByText('AM')).toBeNull();
  });

  it('gère un email vide sans crash', () => {
    const { toJSON } = render(<UserCard email="" displayName={null} />);
    expect(toJSON()).toBeTruthy();
  });
});
