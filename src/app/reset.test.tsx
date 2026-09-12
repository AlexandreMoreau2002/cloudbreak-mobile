import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ResetScreen from '@/app/reset';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRequestPasswordReset = jest.fn();
let mockLocale: 'fr' | 'en' = 'fr';
let mockDebug = true;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      textPrimary: '#111',
      textSecondary: '#555',
      textDisabled: '#aaa',
      accent: '#b28c6e',
      border: '#ddd',
      surface: '#2A2A2A',
    },
    typography: { fontFamily: { bold: 'System', semiBold: 'System', regular: 'System' } },
  }),
}));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: mockLocale }) }));
jest.mock('@/contexts/AuthContext', () => ({
  isRateLimitError: (error: { code?: string; message?: string; status?: number }) =>
    error.status === 429
    || error.code === 'over_email_send_rate_limit'
    || error.message?.toLowerCase().includes('rate limit'),
  useAuth: () => ({ requestPasswordReset: mockRequestPasswordReset }),
}));
jest.mock('@/constants/devConfig', () => ({
  get DEBUG() { return mockDebug; },
}));
jest.mock('@/components/account', () => ({ AuthBackdrop: () => null }));
jest.mock('@/utils/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

describe('ResetScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocale = 'fr';
    mockDebug = true;
    mockRequestPasswordReset.mockResolvedValue(null);
  });

  it('bloque un email vide sans appel réseau', async () => {
    const { getByTestId, getByText } = render(<ResetScreen />);

    fireEvent.press(getByTestId('reset-submit'));

    await waitFor(() => expect(getByText('auth.emptyFields')).toBeTruthy());
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });

  it('rejette un email sans @', async () => {
    const { getByTestId, getByText } = render(<ResetScreen />);

    fireEvent.changeText(getByTestId('reset-email'), 'notanemail');
    fireEvent.press(getByTestId('reset-submit'));

    await waitFor(() => expect(getByText('reset.errorEmail')).toBeTruthy());
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });

  it('applique le fond du thème et accentue la bordure uniquement pendant le focus', () => {
    const { getByTestId } = render(<ResetScreen />);
    const input = getByTestId('reset-email');

    expect(input).toHaveStyle({ backgroundColor: '#2A2A2A', color: '#111', borderColor: '#ddd' });
    fireEvent(input, 'focus');
    expect(input).toHaveStyle({ backgroundColor: '#2A2A2A', color: '#111', borderColor: '#b28c6e' });
    fireEvent(input, 'blur');
    expect(input).toHaveStyle({ backgroundColor: '#2A2A2A', color: '#111', borderColor: '#ddd' });
  });

  it('au succès, délègue le message neutre à la confirmation avec l\'email normalisé', async () => {
    const { getByTestId, queryByText } = render(<ResetScreen />);

    fireEvent.changeText(getByTestId('reset-email'), '  a@b.com  ');
    fireEvent.press(getByTestId('reset-submit'));

    await waitFor(() => expect(mockRequestPasswordReset).toHaveBeenCalledWith('a@b.com', 'fr'));
    expect(queryByText('reset.sent')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/reset-confirm',
      params: { email: 'a@b.com', sent: '1' },
    });
  });

  it('transmet la locale anglaise active', async () => {
    mockLocale = 'en';
    const { getByTestId } = render(<ResetScreen />);

    fireEvent.changeText(getByTestId('reset-email'), 'a@b.com');
    fireEvent.press(getByTestId('reset-submit'));

    await waitFor(() => expect(mockRequestPasswordReset).toHaveBeenCalledWith('a@b.com', 'en'));
  });

  it('reste sur l\'écran si requestPasswordReset renvoie une erreur réseau', async () => {
    mockRequestPasswordReset.mockResolvedValueOnce({ message: 'network' });
    const { getByTestId, getByText } = render(<ResetScreen />);

    fireEvent.changeText(getByTestId('reset-email'), 'a@b.com');
    fireEvent.press(getByTestId('reset-submit'));

    await waitFor(() => expect(getByText('reset.errorNetwork')).toBeTruthy());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each([
    { code: 'over_email_send_rate_limit' },
    { status: 429 },
    { message: 'Recovery rate limit exceeded' },
  ])('affiche une erreur dédiée quand Supabase limite l\'envoi: %o', async (authError) => {
    mockRequestPasswordReset.mockResolvedValueOnce(authError);
    const { getByTestId, getByText } = render(<ResetScreen />);

    fireEvent.changeText(getByTestId('reset-email'), 'a@b.com');
    fireEvent.press(getByTestId('reset-submit'));

    await waitFor(() => expect(getByText('reset.errorRateLimit')).toBeTruthy());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('affiche le spinner unifié et désactive le bouton pendant la requête', async () => {
    let resolveRequest: (value: null) => void = () => undefined;
    mockRequestPasswordReset.mockImplementationOnce(
      () => new Promise<null>(resolve => { resolveRequest = resolve; }),
    );
    const { getByTestId } = render(<ResetScreen />);

    fireEvent.changeText(getByTestId('reset-email'), 'a@b.com');
    fireEvent.press(getByTestId('reset-submit'));

    await waitFor(() => expect(getByTestId('loading-spinner')).toBeTruthy());
    expect(getByTestId('reset-submit').props.accessibilityState).toEqual({ disabled: true });

    resolveRequest(null);
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
  });

  it.each([
    ['ios', 'padding'],
    ['android', undefined],
  ])('adapte le clavier à la plateforme %s', (operatingSystem, expectedBehavior) => {
    const { KeyboardAvoidingView, Platform } = require('react-native');
    const originalOperatingSystem = Platform.OS;
    Platform.OS = operatingSystem;

    try {
      const { UNSAFE_getByType } = render(<ResetScreen />);
      expect(UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe(expectedBehavior);
    } finally {
      Platform.OS = originalOperatingSystem;
    }
  });

  it.each([
    [true, 1],
    [false, 0],
  ])('journalise la soumission seulement quand DEBUG vaut %s', async (debugEnabled, expectedCalls) => {
    mockDebug = debugEnabled;
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    const { getByTestId } = render(<ResetScreen />);

    fireEvent.changeText(getByTestId('reset-email'), 'a@b.com');
    fireEvent.press(getByTestId('reset-submit'));

    await waitFor(() => expect(mockRequestPasswordReset).toHaveBeenCalled());
    expect(debugSpy).toHaveBeenCalledTimes(expectedCalls);
    debugSpy.mockRestore();
  });

  it('le chevron retour appelle router.back', () => {
    const { getByTestId } = render(<ResetScreen />);

    fireEvent.press(getByTestId('reset-back'));

    expect(mockBack).toHaveBeenCalled();
  });

  it('utilise un spacer flexible pour le centrage plutôt que justifyContent sur le contenu', () => {
    const { UNSAFE_getByType } = render(<ResetScreen />);
    const { ScrollView } = require('react-native');
    const scroll = UNSAFE_getByType(ScrollView);
    const children = React.Children.toArray(scroll.props.children) as React.ReactElement<{ style?: object }>[];
    const [spacer, center] = children;

    expect(spacer.props.style).toEqual(expect.objectContaining({ flex: 1 }));
    expect(center.props.style).not.toEqual(expect.objectContaining({ justifyContent: 'center' }));
    expect(center.props.style).not.toEqual(expect.objectContaining({ flex: 1 }));
  });
});
