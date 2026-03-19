import React from 'react';
import ProfileScreen from './profile';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@/utils/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

const mockSignOut = jest.fn();
const mockToggleScheme = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signOut: mockSignOut }),
}));

const mockUseThemeLight = {
  scheme: 'light',
  toggleScheme: mockToggleScheme,
  colors: {
    background: '#EFE8DC',
    surface: '#F7F5F1',
    border: '#E9E4DA',
    accent: '#B28C6E',
    textPrimary: '#1A1A1A',
    textSecondary: '#5E5E5E',
  },
  typography: {
    fontFamily: { regular: 'regular', semiBold: 'semiBold' },
    fontSize: { lg: 22, sm: 14 },
  },
};

let mockScheme = 'light';
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ ...mockUseThemeLight, scheme: mockScheme }),
}));

describe('ProfileScreen', () => {
  beforeEach(() => { jest.clearAllMocks(); mockScheme = 'light'; });

  it('s\'affiche sans erreur', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.comingSoon')).toBeTruthy();
  });

  it('affiche le bouton toggle dark mode en mode light', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.darkMode')).toBeTruthy();
  });

  it('appelle toggleScheme au clic sur le bouton theme', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.darkMode'));
    expect(mockToggleScheme).toHaveBeenCalledTimes(1);
  });

  it('affiche le bouton toggle light mode en mode dark', () => {
    mockScheme = 'dark';
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.lightMode')).toBeTruthy();
  });

  it('affiche le bouton de déconnexion', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.signOut')).toBeTruthy();
  });

  it('appelle signOut au clic sur le bouton', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.signOut'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
