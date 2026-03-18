import React from 'react';
import ProfileScreen from './profile';
import { render, fireEvent } from '@testing-library/react-native';

const mockSignOut = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signOut: mockSignOut }),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#EFE8DC',
      surface: '#F7F5F1',
      border: '#E9E4DA',
      textPrimary: '#1A1A1A',
      textSecondary: '#5E5E5E',
    },
    typography: {
      fontFamily: { regular: 'regular', semiBold: 'semiBold' },
      fontSize: { lg: 22, sm: 14 },
    },
  }),
}));

describe('ProfileScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('s\'affiche sans erreur', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('Profile — coming soon')).toBeTruthy();
  });

  it('affiche le bouton de déconnexion', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('Sign out')).toBeTruthy();
  });

  it('appelle signOut au clic sur le bouton', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('Sign out'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
