import React from 'react';
import ProfileScreen from '@/app/(tabs)/profile';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/utils/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

const mockSignOut = jest.fn();
const mockToggleScheme = jest.fn();
const mockToggleLocale = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signOut: mockSignOut }),
}));

jest.mock('@/components/CloudLayerViz', () => ({
  CloudLayerViz: () => null,
}));

let mockLocale: 'fr' | 'en' = 'fr';
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: mockLocale, toggleLocale: mockToggleLocale }),
}));

jest.mock('@/services/mockData/score', () => ({
  MOCK_SCORE_HIGH: { cloud_layer_viz: { summit_altitude: 2257, cloud_base: 1200, pressure_levels: [] } },
  MOCK_SCORE_MEDIUM: { cloud_layer_viz: { summit_altitude: 2341, cloud_base: 1800, pressure_levels: [] } },
  MOCK_SCORE_LOW: { cloud_layer_viz: { summit_altitude: 4808, cloud_base: 3200, pressure_levels: [] } },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 12, right: 0, bottom: 0, left: 0 }),
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
  beforeEach(() => { jest.clearAllMocks(); mockScheme = 'light'; mockLocale = 'fr'; });

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

  it('affiche le bouton de langue vers EN en locale fr', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.languageEn')).toBeTruthy();
  });

  it('appelle toggleLocale au clic sur le bouton langue', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.languageEn'));
    expect(mockToggleLocale).toHaveBeenCalledTimes(1);
  });

  it('affiche le bouton de langue vers FR en locale en', () => {
    mockLocale = 'en';
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.languageFr')).toBeTruthy();
  });

  it('affiche la sandbox cloud layer viz', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('CloudLayerViz Sandbox')).toBeTruthy();
    expect(getByText('Variante A · sommet au-dessus')).toBeTruthy();
    expect(getByText('Variante B · marge serrée')).toBeTruthy();
    expect(getByText('Variante C · nuage couvrant')).toBeTruthy();
    expect(getByText('Variante D · ciel dégagé (WIP)')).toBeTruthy();
  });

  it('appelle signOut au clic sur le bouton', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.signOut'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
