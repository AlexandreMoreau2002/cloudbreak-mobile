import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AccountScreen from '@/app/account';
import { AuthBackdrop } from '@/components/account/AuthBackdrop';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockCancel = jest.fn().mockResolvedValue(undefined);
const mockBegin = jest.fn().mockResolvedValue(null);
const mockSignIn = jest.fn().mockResolvedValue(null);
const mockApple = jest.fn().mockResolvedValue(null);
const mockSetCredentials = jest.fn();
const mockFinish = jest.fn().mockResolvedValue(undefined);
const mockRetryProvisioning = jest.fn().mockResolvedValue(null);
let mockParams: Record<string, string> = {};
let mockPendingAction: { kind: 'favorite'; peakId: string } | null = null;
let mockSubmitArgs: [string, string] = ['a@b.com', 'Aa!123456'];
let mockLocale: 'fr' | 'en' = 'fr';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ colors: { background: '#fff', textPrimary: '#111', textSecondary: '#555', accent: '#b28c6e' }, typography: { fontFamily: { bold: 'System', semiBold: 'System' } } }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: mockLocale }) }));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ beginEmailUpgrade: mockBegin, signIn: mockSignIn, signInWithApple: mockApple, retryProvisioning: mockRetryProvisioning }),
  isProvisioningError: (message: string) =>
    new Set(['provisioning_failed', 'email_upgrade_provisioning_failed']).has(message.trim().toLowerCase()),
}));
jest.mock('@/contexts/AccountGateContext', () => ({ useAccountGate: () => ({ pendingAction: mockPendingAction, cancelAccountFlow: mockCancel, finishAccountCreation: mockFinish, setEmailUpgradeCredentials: mockSetCredentials }) }));
jest.mock('@/components/account', () => { const { TouchableOpacity: Button, Text: Label, View } = require('react-native'); return { AccountForm: ({ onSubmit, onApple, onForgotPassword, mode, error }: { onSubmit: (email: string, password: string) => void; onApple: () => void; onForgotPassword: () => void; mode: string; error?: string | null }) => <View><Button testID="form" onPress={() => onSubmit(mockSubmitArgs[0], mockSubmitArgs[1])}><Label>{mode}</Label></Button><Button testID="apple" onPress={onApple}><Label>Apple</Label></Button><Button testID="forgot" onPress={onForgotPassword}><Label>Forgot</Label></Button>{error ? <Label>{error}</Label> : null}</View> }; });
jest.mock('@/utils/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

describe('AccountScreen route contracts', () => {
  beforeEach(() => { jest.clearAllMocks(); mockApple.mockResolvedValue(null); mockParams = {}; mockPendingAction = null; mockSubmitArgs = ['a@b.com', 'Aa!123456']; mockLocale = 'fr'; mockRetryProvisioning.mockResolvedValue(null); });

  it('utilise un spacer flexible pour le centrage plutôt que justifyContent sur le contenu — le CTA ne peut jamais être poussé hors écran', () => {
    const { UNSAFE_getByType } = render(<AccountScreen />);
    const { ScrollView } = require('react-native');
    const scroll = UNSAFE_getByType(ScrollView);
    const contentStyle = scroll.props.contentContainerStyle;
    const children = React.Children.toArray(scroll.props.children) as React.ReactElement<{ style?: object }>[];
    const [spacer, center] = children;

    expect(contentStyle).toEqual(expect.objectContaining({ paddingBottom: expect.any(Number) }));
    // Le spacer se comprime en premier quand l'espace manque (clavier ouvert) — le contenu
    // qui le suit garde toujours sa hauteur naturelle et ne peut jamais être coupé.
    expect(spacer.props.style).toEqual(expect.objectContaining({ flex: 1 }));
    // Le contenu lui-même ne doit JAMAIS avoir justifyContent: 'center' — c'est ce qui causait
    // le bug corrigé par 21d0b06 (CTA poussé à un offset négatif sous clavier).
    expect(center.props.style).not.toEqual(expect.objectContaining({ justifyContent: 'center' }));
    // Le contenu ne doit pas non plus porter flex:1 lui-même — sinon il entrerait dans le même
    // pool de compression que le spacer et pourrait à nouveau être rétréci sous sa taille
    // naturelle (perdant la garantie que seul le spacer absorbe le manque d'espace).
    expect(center.props.style).not.toEqual(expect.objectContaining({ flex: 1 }));
  });

  it('bloque la soumission quand un champ est vide et affiche une erreur', async () => {
    mockSubmitArgs = ['   ', ''];
    const { getByTestId, getByText } = render(<AccountScreen />);
    fireEvent.press(getByTestId('form'));
    await waitFor(() => expect(getByText('auth.emptyFields')).toBeTruthy());
    expect(mockBegin).not.toHaveBeenCalled();
  });

  it('mappe les messages Supabase vers une copy produit', async () => {
    mockBegin.mockResolvedValueOnce({ message: 'User already registered' });
    const { getByTestId, getByText, rerender } = render(<AccountScreen />);
    fireEvent.press(getByTestId('form'));
    await waitFor(() => expect(getByText('account.errorTaken')).toBeTruthy());

    mockBegin.mockResolvedValueOnce({ message: 'Invalid login credentials' });
    rerender(<AccountScreen />);
    fireEvent.press(getByTestId('form'));
    await waitFor(() => expect(getByText('account.errorWrongPassword')).toBeTruthy());
  });

  it.each([
    ['User not found', 'account.errorNetwork'],
    ['User account does not exist', 'account.errorNetwork'],
    ['EMAIL_UPGRADE_UNAVAILABLE', 'account.emailUpgradeUnavailable'],
    ['Unexpected Supabase failure', 'account.errorNetwork'],
  ])('ne transforme pas "%s" en erreur e-mail déjà pris', async (message, expectedCopy) => {
    mockBegin.mockResolvedValueOnce({ message });
    const { getByTestId, getByText, queryByText } = render(<AccountScreen />);

    fireEvent.press(getByTestId('form'));

    await waitFor(() => expect(getByText(expectedCopy)).toBeTruthy());
    expect(queryByText('account.errorTaken')).toBeNull();
    expect(queryByText(message)).toBeNull();
  });

  it('le chevron retour annule le parcours sans quitter le mode invité', () => {
    const { getByTestId } = render(<AccountScreen />);
    fireEvent.press(getByTestId('account-back'));
    expect(mockCancel).toHaveBeenCalled();
  });

  it('affiche "Explorer d\'abord" seulement au premier lancement', () => {
    mockParams = { firstRun: '1' };
    const { getByText } = render(<AccountScreen />);
    fireEvent.press(getByText('account.explore'));
    expect(mockCancel).toHaveBeenCalled();
  });

  it('ignore le bouton Apple hors iOS', async () => {
    const Platform = require('react-native').Platform;
    const original = Platform.OS;
    Platform.OS = 'android';
    const { getByTestId } = render(<AccountScreen />);
    fireEvent.press(getByTestId('apple'));
    await waitFor(() => expect(mockApple).not.toHaveBeenCalled());
    Platform.OS = original;
  });

  it('sends email creation to verification while retaining credentials in memory', async () => {
    const { getByTestId, UNSAFE_getByType } = render(<AccountScreen />);
    expect(UNSAFE_getByType(AuthBackdrop)).toBeTruthy();
    fireEvent.press(getByTestId('form'));
    await waitFor(() => expect(mockBegin).toHaveBeenCalledWith('a@b.com', 'fr'));
    expect(mockSetCredentials).toHaveBeenCalledWith({ email: 'a@b.com', password: 'Aa!123456' });
    expect(mockPush).toHaveBeenCalledWith('/verify');
  });

  it('keeps email creation on the account screen when OTP is not configured', async () => {
    mockBegin.mockResolvedValueOnce({ message: 'EMAIL_UPGRADE_UNAVAILABLE' });
    const { getByTestId } = render(<AccountScreen />);

    fireEvent.press(getByTestId('form'));

    await waitFor(() => expect(mockBegin).toHaveBeenCalledWith('a@b.com', 'fr'));
    expect(mockPush).not.toHaveBeenCalledWith('/verify');
    expect(mockSetCredentials).not.toHaveBeenCalled();
  });

  it('passes English to email creation when the active language is English', async () => {
    mockLocale = 'en';
    const { getByTestId } = render(<AccountScreen />);

    fireEvent.press(getByTestId('form'));

    await waitFor(() => expect(mockBegin).toHaveBeenCalledWith('a@b.com', 'en'));
  });

  it('shows a distinct recoverable error and retry when provisioning fails after email login', async () => {
    mockParams = { mode: 'login' };
    mockPendingAction = { kind: 'favorite', peakId: 'peak-1' };
    mockSignIn.mockResolvedValueOnce({ message: 'PROVISIONING_FAILED' });
    const { getByTestId, getByText, queryByText } = render(<AccountScreen />);
    fireEvent.press(getByTestId('form'));
    await waitFor(() => expect(getByText('account.provisioningError')).toBeTruthy());
    expect(queryByText('account.errorNetwork')).toBeNull();

    fireEvent.press(getByText('account.retryProvisioning'));
    await waitFor(() => expect(mockRetryProvisioning).toHaveBeenCalledTimes(1));
    expect(mockFinish).toHaveBeenCalled();
  });

  it('shows a distinct recoverable error and retry when provisioning fails after Apple sign-in', async () => {
    mockParams = { mode: 'login' };
    mockPendingAction = { kind: 'favorite', peakId: 'peak-1' };
    mockApple.mockResolvedValueOnce({ message: 'EMAIL_UPGRADE_PROVISIONING_FAILED' });
    const { getByTestId, getByText } = render(<AccountScreen />);
    fireEvent.press(getByTestId('apple'));
    await waitFor(() => expect(getByText('account.provisioningError')).toBeTruthy());

    fireEvent.press(getByText('account.retryProvisioning'));
    await waitFor(() => expect(mockRetryProvisioning).toHaveBeenCalledTimes(1));
    expect(mockFinish).toHaveBeenCalled();
  });

  it('routes to survey (not complete) after a successful retry following an Apple signup provisioning failure', async () => {
    mockParams = {};
    mockApple.mockResolvedValueOnce({ message: 'PROVISIONING_FAILED' });
    const { getByTestId, getByText } = render(<AccountScreen />);
    fireEvent.press(getByTestId('apple'));
    await waitFor(() => expect(getByText('account.provisioningError')).toBeTruthy());

    fireEvent.press(getByText('account.retryProvisioning'));
    await waitFor(() => expect(mockRetryProvisioning).toHaveBeenCalledTimes(1));
    expect(mockPush).toHaveBeenCalledWith('/survey');
    expect(mockFinish).not.toHaveBeenCalled();
  });

  it('keeps provisioning error visible after a second failed retry on account screen', async () => {
    mockParams = { mode: 'login' };
    mockSignIn.mockResolvedValueOnce({ message: 'PROVISIONING_FAILED' });
    mockRetryProvisioning.mockResolvedValueOnce({ message: 'PROVISIONING_FAILED' });
    const { getByTestId, getByText } = render(<AccountScreen />);
    fireEvent.press(getByTestId('form'));
    await waitFor(() => expect(getByText('account.provisioningError')).toBeTruthy());
    fireEvent.press(getByText('account.retryProvisioning'));
    await waitFor(() => expect(mockRetryProvisioning).toHaveBeenCalledTimes(1));
    expect(getByText('account.provisioningError')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('finishes an existing login through AccountGate without verification', async () => {
    mockParams = { mode: 'login' };
    mockPendingAction = { kind: 'favorite', peakId: 'peak-1' };
    const { getByTestId } = render(<AccountScreen />);
    fireEvent.press(getByTestId('form'));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('a@b.com', 'Aa!123456'));
    expect(mockFinish).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalledWith('/verify');
  });

  it('sends Apple creation intent and opens the survey', async () => {
    const { getByTestId } = render(<AccountScreen />);
    fireEvent.press(getByTestId('apple'));
    await waitFor(() => expect(mockApple).toHaveBeenCalledWith('creation'));
    expect(mockPush).toHaveBeenCalledWith('/survey');
  });

  it('sends Apple connexion intent and finishes without opening the survey', async () => {
    mockParams = { mode: 'login' };
    mockPendingAction = { kind: 'favorite', peakId: 'peak-1' };
    const { getByTestId } = render(<AccountScreen />);
    fireEvent.press(getByTestId('apple'));
    await waitFor(() => expect(mockApple).toHaveBeenCalledWith('connexion'));
    expect(mockFinish).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalledWith('/survey');
  });

  it('ouvre le parcours de réinitialisation depuis le mode connexion', () => {
    mockParams = { mode: 'login' };
    const { getByTestId } = render(<AccountScreen />);
    fireEvent.press(getByTestId('forgot'));
    expect(mockPush).toHaveBeenCalledWith('/reset');
  });
});
