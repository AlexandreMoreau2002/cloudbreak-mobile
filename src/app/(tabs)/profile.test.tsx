import React from 'react';
import ProfileScreen from '@/app/(tabs)/profile';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 12, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@/utils/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

const mockSignOut = jest.fn();
const mockToggleScheme = jest.fn();
const mockToggleLocale = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
    session: { user: { email: 'test@example.com' } },
  }),
}));

const mockSetSelectedPeak = jest.fn();
jest.mock('@/contexts/SelectedPeakContext', () => ({
  useSelectedPeak: () => ({ setSelectedPeak: mockSetSelectedPeak }),
}));

let mockLocale: 'fr' | 'en' = 'fr';
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: mockLocale, toggleLocale: mockToggleLocale }),
}));

let mockScheme = 'light';
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    scheme: mockScheme,
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
      fontFamily: { regular: 'regular', semiBold: 'semiBold', bold: 'bold' },
      fontSize: { lg: 22, sm: 14 },
    },
  }),
}));

describe('ProfileScreen', () => {
  beforeEach(() => { jest.clearAllMocks(); mockScheme = 'light'; mockLocale = 'fr'; });

  it('s\'affiche sans erreur', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.title')).toBeTruthy();
  });

  it('affiche la carte utilisateur avec email', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('test@example.com')).toBeTruthy();
  });

  it('affiche le banner pro', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.proBannerTitle')).toBeTruthy();
  });

  it('affiche la ligne apparence en mode light', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.appearance')).toBeTruthy();
    expect(getByText('profile.appearanceLight')).toBeTruthy();
  });

  it('affiche la ligne apparence en mode dark', () => {
    mockScheme = 'dark';
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.appearanceDark')).toBeTruthy();
  });

  it('appelle toggleScheme au clic sur la ligne apparence', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.appearance'));
    expect(mockToggleScheme).toHaveBeenCalledTimes(1);
  });

  it('affiche la ligne langue avec la valeur courante en locale fr', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.language')).toBeTruthy();
    expect(getByText('profile.languageFrLabel')).toBeTruthy();
  });

  it('affiche la valeur langue en locale en', () => {
    mockLocale = 'en';
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.languageEnLabel')).toBeTruthy();
  });

  it('appelle toggleLocale au clic sur la ligne langue', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.language'));
    expect(mockToggleLocale).toHaveBeenCalledTimes(1);
  });

  it('affiche le bouton de déconnexion', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.signOut')).toBeTruthy();
  });

  it('appelle signOut au clic sur se déconnecter', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.signOut'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
