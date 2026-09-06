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
let mockParams: Record<string, string> = {};
let mockPendingAction: { kind: 'favorite'; peakId: string } | null = null;
let mockSubmitArgs: [string, string] = ['a@b.com', 'Aa!123456'];

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ colors: { background: '#fff', textPrimary: '#111', textSecondary: '#555', accent: '#b28c6e' }, typography: { fontFamily: { bold: 'System', semiBold: 'System' } } }) }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ beginEmailUpgrade: mockBegin, signIn: mockSignIn, signInWithApple: mockApple }) }));
jest.mock('@/contexts/AccountGateContext', () => ({ useAccountGate: () => ({ pendingAction: mockPendingAction, cancelAccountFlow: mockCancel, finishAccountCreation: mockFinish, setEmailUpgradeCredentials: mockSetCredentials }) }));
jest.mock('@/components/account', () => { const { TouchableOpacity: Button, Text: Label, View } = require('react-native'); return { AccountForm: ({ onSubmit, onApple, mode, error }: { onSubmit: (email: string, password: string) => void; onApple: () => void; mode: string; error?: string | null }) => <View><Button testID="form" onPress={() => onSubmit(mockSubmitArgs[0], mockSubmitArgs[1])}><Label>{mode}</Label></Button><Button testID="apple" onPress={onApple}><Label>Apple</Label></Button>{error ? <Label>{error}</Label> : null}</View> }; });
jest.mock('@/utils/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

describe('AccountScreen route contracts', () => {
  beforeEach(() => { jest.clearAllMocks(); mockApple.mockResolvedValue(null); mockParams = {}; mockPendingAction = null; mockSubmitArgs = ['a@b.com', 'Aa!123456']; });

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
    await waitFor(() => expect(mockBegin).toHaveBeenCalledWith('a@b.com'));
    expect(mockSetCredentials).toHaveBeenCalledWith({ email: 'a@b.com', password: 'Aa!123456' });
    expect(mockPush).toHaveBeenCalledWith('/verify');
  });

  it('keeps email creation on the account screen when OTP is not configured', async () => {
    mockBegin.mockResolvedValueOnce({ message: 'EMAIL_UPGRADE_UNAVAILABLE' });
    const { getByTestId } = render(<AccountScreen />);

    fireEvent.press(getByTestId('form'));

    await waitFor(() => expect(mockBegin).toHaveBeenCalledWith('a@b.com'));
    expect(mockPush).not.toHaveBeenCalledWith('/verify');
    expect(mockSetCredentials).not.toHaveBeenCalled();
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
});
