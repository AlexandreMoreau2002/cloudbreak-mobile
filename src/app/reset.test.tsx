import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ResetScreen from '@/app/reset';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRequestPasswordReset = jest.fn();
let mockLocale: 'fr' | 'en' = 'fr';

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
    },
    typography: { fontFamily: { bold: 'System', semiBold: 'System', regular: 'System' } },
  }),
}));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: mockLocale }) }));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ requestPasswordReset: mockRequestPasswordReset }),
}));
jest.mock('@/components/account', () => ({ AuthBackdrop: () => null }));
jest.mock('@/utils/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

describe('ResetScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocale = 'fr';
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

  it('accentue la bordure blanche du champ uniquement pendant le focus', () => {
    const { getByTestId } = render(<ResetScreen />);
    const input = getByTestId('reset-email');

    expect(input).toHaveStyle({ backgroundColor: '#fff', borderColor: '#ddd' });
    fireEvent(input, 'focus');
    expect(input).toHaveStyle({ backgroundColor: '#fff', borderColor: '#b28c6e' });
    fireEvent(input, 'blur');
    expect(input).toHaveStyle({ backgroundColor: '#fff', borderColor: '#ddd' });
  });

  it('au succès, affiche le message neutre et navigue vers la confirmation avec l\'email normalisé', async () => {
    const { getByTestId, getByText } = render(<ResetScreen />);

    fireEvent.changeText(getByTestId('reset-email'), '  a@b.com  ');
    fireEvent.press(getByTestId('reset-submit'));

    await waitFor(() => expect(mockRequestPasswordReset).toHaveBeenCalledWith('a@b.com', 'fr'));
    expect(getByText('reset.sent')).toBeTruthy();
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/reset-confirm', params: { email: 'a@b.com' } });
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

  it('le chevron retour appelle router.back', () => {
    const { getByTestId } = render(<ResetScreen />);

    fireEvent.press(getByTestId('reset-back'));

    expect(mockBack).toHaveBeenCalled();
  });
});
