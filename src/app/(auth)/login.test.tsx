import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '@/app/(auth)/login';

const mockSetEmail = jest.fn();
const mockToggleMode = jest.fn();
const mockSetPassword = jest.fn();
const mockHandleSubmit = jest.fn();

const mockAuthForm = {
  email: '',
  setEmail: mockSetEmail,
  password: '',
  setPassword: mockSetPassword,
  loading: false,
  mode: 'login' as 'login' | 'signup',
  toggleMode: mockToggleMode,
  handleSubmit: mockHandleSubmit,
};

jest.mock('@/hooks/useAuthForm', () => ({
  useAuthForm: () => mockAuthForm,
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#EFE8DC',
      surface: '#F7F5F1',
      border: '#E9E4DA',
      accent: '#B28C6E',
      textPrimary: '#1A1A1A',
      textSecondary: '#5E5E5E',
      textDisabled: '#A0A0A0',
    },
    typography: {
      fontFamily: { light: 'light', regular: 'regular', semiBold: 'semiBold', bold: 'bold' },
      fontSize: { sm: 14 },
    },
    spacing: { sm: 8 },
    radius: { sm: 8 },
  }),
}));

jest.mock('@/utils/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

describe('LoginScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it("s'affiche sans erreur en mode login", () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Cloudbreak')).toBeTruthy();
    expect(getByText('auth.login')).toBeTruthy();
  });

  it('appelle handleSubmit au clic sur le bouton', () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('auth.login'));
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
  });

  it('appelle toggleMode au clic sur le lien signup', () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('auth.signup'));
    expect(mockToggleMode).toHaveBeenCalledTimes(1);
  });

  it("affiche le bouton 'login' quand mode = signup", () => {
    mockAuthForm.mode = 'signup';
    const { getByText } = render(<LoginScreen />);
    expect(getByText('auth.signup')).toBeTruthy();
    expect(getByText('auth.login')).toBeTruthy();
    mockAuthForm.mode = 'login';
  });

  it('affiche Chargement quand loading = true', () => {
    mockAuthForm.loading = true;
    const { getByText } = render(<LoginScreen />);
    expect(getByText('auth.loading')).toBeTruthy();
    mockAuthForm.loading = false;
  });
});
