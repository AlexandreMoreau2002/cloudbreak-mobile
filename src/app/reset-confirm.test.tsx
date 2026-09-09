import { TouchableOpacity } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import ResetConfirmScreen from '@/app/reset-confirm';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCompletePasswordReset = jest.fn();
const mockRequestPasswordReset = jest.fn();
const mockFinishAccountCreation = jest.fn();
let mockDebug = true;
let mockLocale: 'fr' | 'en' = 'fr';
let mockParams: { email?: string; sent?: string } = { email: 'a@b.com' };
let mockPendingAction: { kind: 'favorite'; peakId: string } | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 8, bottom: 12, left: 0, right: 0 }),
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
  useAuth: () => ({
    completePasswordReset: mockCompletePasswordReset,
    requestPasswordReset: mockRequestPasswordReset,
  }),
}));
jest.mock('@/contexts/AccountGateContext', () => ({
  useAccountGate: () => ({
    pendingAction: mockPendingAction,
    finishAccountCreation: mockFinishAccountCreation,
  }),
}));
jest.mock('@/constants/devConfig', () => ({
  get DEBUG() { return mockDebug; },
}));
jest.mock('@/components/account', () => {
  const { TextInput, View } = require('react-native');
  return {
    AuthBackdrop: () => <View testID="auth-backdrop" />,
    CodeInput: ({ value, onChange, error }: { value: string; onChange: (input: string) => void; error: boolean }) => (
      <TextInput
        accessibilityLabel={error ? 'code-error' : 'code-valid'}
        testID="code"
        value={value}
        onChangeText={onChange}
      />
    ),
    PasswordField: ({ value, onChangeText }: { value: string; onChangeText: (input: string) => void }) => (
      <TextInput testID="new-password" value={value} onChangeText={onChangeText} />
    ),
  };
});
jest.mock('@/utils/i18n', () => ({
  __esModule: true,
  default: {
    t: (key: string, options?: { count?: number }) =>
      options?.count != null ? `${key}:${options.count}` : key,
  },
}));

describe('ResetConfirmScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockDebug = true;
    mockLocale = 'fr';
    mockParams = { email: 'a@b.com' };
    mockPendingAction = null;
    mockCompletePasswordReset.mockResolvedValue(null);
    mockRequestPasswordReset.mockResolvedValue(null);
    mockFinishAccountCreation.mockResolvedValue(undefined);
  });

  afterEach(() => jest.useRealTimers());

  it('redirige vers /reset si aucun email ne permet de confirmer', async () => {
    mockParams = {};

    render(<ResetConfirmScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/reset'));
  });

  it('affiche la confirmation neutre uniquement après l’envoi initial', () => {
    mockParams = { email: 'a@b.com', sent: '1' };
    const { getByText, queryByText, rerender } = render(<ResetConfirmScreen />);

    expect(getByText('reset.sent')).toBeTruthy();

    mockParams = { email: 'a@b.com' };
    rerender(<ResetConfirmScreen />);
    expect(queryByText('reset.sent')).toBeNull();
  });

  it.each([
    ['12345', 'NewPass1!'],
    ['1234567', 'NewPass1!'],
    ['123456', '1234567'],
  ])('bloque les valeurs invalides code=%s et mot de passe=%s', (code, password) => {
    const { getByTestId, UNSAFE_getAllByType } = render(<ResetConfirmScreen />);

    fireEvent.changeText(getByTestId('code'), code);
    fireEvent.changeText(getByTestId('new-password'), password);
    const submit = UNSAFE_getAllByType(TouchableOpacity)
      .find((element) => element.props.testID === 'reset-confirm-submit');
    expect(submit).toBeTruthy();
    submit!.props.onPress();

    expect(mockCompletePasswordReset).not.toHaveBeenCalled();
  });

  it('confirme avec un code exact et remplace par les tabs sans action en attente', async () => {
    const { getByTestId } = render(<ResetConfirmScreen />);

    fireEvent.changeText(getByTestId('code'), '123456');
    fireEvent.changeText(getByTestId('new-password'), 'NewPass1!');
    fireEvent.press(getByTestId('reset-confirm-submit'));

    await waitFor(() =>
      expect(mockCompletePasswordReset).toHaveBeenCalledWith('a@b.com', '123456', 'NewPass1!'),
    );
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('rejoue l’action en attente après succès sans forcer la navigation vers les tabs', async () => {
    mockPendingAction = { kind: 'favorite', peakId: 'p1' };
    const { getByTestId } = render(<ResetConfirmScreen />);

    fireEvent.changeText(getByTestId('code'), '123456');
    fireEvent.changeText(getByTestId('new-password'), 'NewPass1!');
    fireEvent.press(getByTestId('reset-confirm-submit'));

    await waitFor(() => expect(mockFinishAccountCreation).toHaveBeenCalledTimes(1));
    expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)');
  });

  it.each([
    'Weak credential',
    'Password should contain a symbol',
    'Must be at least 8 characters',
    'Invalid password',
  ])(
    'classe « %s » comme erreur de mot de passe',
    async (message) => {
      mockCompletePasswordReset.mockResolvedValueOnce({ message });
      const { getByTestId, getByText, queryByLabelText } = render(<ResetConfirmScreen />);

      fireEvent.changeText(getByTestId('code'), '123456');
      fireEvent.changeText(getByTestId('new-password'), 'NewPass1!');
      fireEvent.press(getByTestId('reset-confirm-submit'));

      await waitFor(() => expect(getByText('reset.errorPassword')).toBeTruthy());
      expect(queryByLabelText('code-error')).toBeNull();
      expect(mockReplace).not.toHaveBeenCalled();
    },
  );

  it.each([
    'Token rejected',
    'OTP verification failed',
    'Code has expired',
    'Invalid recovery code',
  ])('classe « %s » comme erreur de code', async (message) => {
    mockCompletePasswordReset.mockResolvedValueOnce({ message });
    const { getByTestId, getByText, getByLabelText } = render(<ResetConfirmScreen />);

    fireEvent.changeText(getByTestId('code'), '000000');
    fireEvent.changeText(getByTestId('new-password'), 'NewPass1!');
    fireEvent.press(getByTestId('reset-confirm-submit'));

    await waitFor(() => expect(getByText('reset.errorCode')).toBeTruthy());
    expect(getByLabelText('code-error')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it.each([
    'Network request failed',
    'EMAIL_UPGRADE_PROVISIONING_FAILED',
    'Unexpected server failure',
  ])('classe « %s » comme erreur réseau générique', async (message) => {
    mockCompletePasswordReset.mockResolvedValueOnce({ message });
    const { getByTestId, getByText, queryByLabelText } = render(<ResetConfirmScreen />);

    fireEvent.changeText(getByTestId('code'), '123456');
    fireEvent.changeText(getByTestId('new-password'), 'NewPass1!');
    fireEvent.press(getByTestId('reset-confirm-submit'));

    await waitFor(() => expect(getByText('reset.errorNetwork')).toBeTruthy());
    expect(queryByLabelText('code-error')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renvoie le code dans la locale active et applique un cooldown de 30 secondes', async () => {
    mockLocale = 'en';
    const { getByTestId, getByText, UNSAFE_getAllByType } = render(<ResetConfirmScreen />);

    fireEvent.press(getByTestId('reset-confirm-resend'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockRequestPasswordReset).toHaveBeenCalledWith('a@b.com', 'en');
    expect(getByText('reset.resendWait:30')).toBeTruthy();

    const resend = UNSAFE_getAllByType(TouchableOpacity)
      .find((element) => element.props.testID === 'reset-confirm-resend');
    expect(resend).toBeTruthy();
    resend!.props.onPress();
    expect(mockRequestPasswordReset).toHaveBeenCalledTimes(1);

    act(() => jest.runOnlyPendingTimers());
    expect(getByText('reset.resendWait:29')).toBeTruthy();
  });

  it('affiche une erreur réseau sans cooldown puis autorise un nouveau renvoi', async () => {
    mockRequestPasswordReset.mockResolvedValueOnce({ message: 'network' });
    const { getByTestId, getByText, queryByText } = render(<ResetConfirmScreen />);

    fireEvent.press(getByTestId('reset-confirm-resend'));

    await waitFor(() => expect(getByText('reset.errorNetwork')).toBeTruthy());
    expect(queryByText('reset.resendWait:30')).toBeNull();

    fireEvent.press(getByTestId('reset-confirm-resend'));
    await waitFor(() => expect(mockRequestPasswordReset).toHaveBeenCalledTimes(2));
    expect(getByText('reset.resendWait:30')).toBeTruthy();
  });

  it('verrouille atomiquement deux confirmations immédiates pendant le chargement', async () => {
    let resolveRequest: (value: null) => void = () => undefined;
    const deferredRequest = new Promise<null>((resolve) => { resolveRequest = resolve; });
    mockCompletePasswordReset.mockReturnValue(deferredRequest);
    const { getByTestId, UNSAFE_getAllByType } = render(<ResetConfirmScreen />);

    fireEvent.changeText(getByTestId('code'), '123456');
    fireEvent.changeText(getByTestId('new-password'), 'NewPass1!');
    const submit = UNSAFE_getAllByType(TouchableOpacity)
      .find((element) => element.props.testID === 'reset-confirm-submit');
    expect(submit).toBeTruthy();

    act(() => {
      submit!.props.onPress();
      submit!.props.onPress();
    });

    await waitFor(() => expect(getByTestId('loading-spinner')).toBeTruthy());
    expect(mockCompletePasswordReset).toHaveBeenCalledTimes(1);

    resolveRequest(null);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
  });

  it('verrouille atomiquement deux renvois immédiats et désactive le bouton pendant l’appel', async () => {
    let resolveRequest: (value: null) => void = () => undefined;
    const deferredRequest = new Promise<null>((resolve) => { resolveRequest = resolve; });
    mockRequestPasswordReset.mockReturnValue(deferredRequest);
    const { getByTestId, getByText, UNSAFE_getAllByType } = render(<ResetConfirmScreen />);
    const resend = UNSAFE_getAllByType(TouchableOpacity)
      .find((element) => element.props.testID === 'reset-confirm-resend');
    expect(resend).toBeTruthy();

    act(() => {
      resend!.props.onPress();
      resend!.props.onPress();
    });

    expect(mockRequestPasswordReset).toHaveBeenCalledTimes(1);
    expect(getByTestId('reset-confirm-resend').props.accessibilityState).toEqual({ disabled: true });
    expect(getByText('reset.resend')).toBeTruthy();

    resolveRequest(null);
    await waitFor(() => expect(getByText('reset.resendWait:30')).toBeTruthy());
  });

  it.each([
    [true, 1],
    [false, 0],
  ])('journalise seulement la longueur du code quand DEBUG vaut %s', async (debugEnabled, expectedCalls) => {
    mockDebug = debugEnabled;
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    const { getByTestId } = render(<ResetConfirmScreen />);

    fireEvent.changeText(getByTestId('code'), '123456');
    fireEvent.changeText(getByTestId('new-password'), 'NewPass1!');
    fireEvent.press(getByTestId('reset-confirm-submit'));

    await waitFor(() => expect(mockCompletePasswordReset).toHaveBeenCalled());
    expect(debugSpy).toHaveBeenCalledTimes(expectedCalls);
    if (debugEnabled) {
      expect(debugSpy).toHaveBeenCalledWith('[reset-confirm] submit', { codeLength: 6 });
    }
    debugSpy.mockRestore();
  });

  it('affiche le décor, applique les insets et permet le retour', () => {
    const { getByTestId } = render(<ResetConfirmScreen />);

    expect(getByTestId('auth-backdrop')).toBeTruthy();
    expect(getByTestId('reset-confirm-screen')).toHaveStyle({ paddingTop: 8, paddingBottom: 54 });

    fireEvent.press(getByTestId('reset-confirm-back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
