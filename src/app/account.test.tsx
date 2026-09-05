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

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ colors: { background: '#fff', textPrimary: '#111', textSecondary: '#555', accent: '#b28c6e' }, typography: { fontFamily: { bold: 'System', semiBold: 'System' } } }) }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ beginEmailUpgrade: mockBegin, signIn: mockSignIn, signInWithApple: mockApple }) }));
jest.mock('@/contexts/AccountGateContext', () => ({ useAccountGate: () => ({ pendingAction: mockPendingAction, cancelAccountFlow: mockCancel, finishAccountCreation: mockFinish, setEmailUpgradeCredentials: mockSetCredentials }) }));
jest.mock('@/components/account', () => { const { TouchableOpacity: Button, Text: Label, View } = require('react-native'); return { AccountForm: ({ onSubmit, onApple, mode }: { onSubmit: (email: string, password: string) => void; onApple: () => void; mode: string }) => <View><Button testID="form" onPress={() => onSubmit('a@b.com', 'Aa!123456')}><Label>{mode}</Label></Button><Button testID="apple" onPress={onApple}><Label>Apple</Label></Button></View> }; });
jest.mock('@/utils/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

describe('AccountScreen route contracts', () => {
  beforeEach(() => { jest.clearAllMocks(); mockApple.mockResolvedValue(null); mockParams = {}; mockPendingAction = null; });

  it('sends email creation to verification while retaining credentials in memory', async () => {
    const { getByTestId, UNSAFE_getByType } = render(<AccountScreen />);
    expect(UNSAFE_getByType(AuthBackdrop)).toBeTruthy();
    fireEvent.press(getByTestId('form'));
    await waitFor(() => expect(mockBegin).toHaveBeenCalledWith('a@b.com'));
    expect(mockSetCredentials).toHaveBeenCalledWith({ email: 'a@b.com', password: 'Aa!123456' });
    expect(mockPush).toHaveBeenCalledWith('/verify');
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
