import { render, fireEvent, waitFor } from '@testing-library/react-native';
import VerifyScreen from '@/app/verify';
let mockLocale: 'fr' | 'en' = 'fr';
let mockCredentials: { email: string; password: string } | null = { email: 'a@b.com', password: 'Aa!123456' };
const mockPush = jest.fn(); const mockReplace = jest.fn(); const mockBack = jest.fn(); const mockComplete = jest.fn().mockResolvedValue(null); const mockResend = jest.fn().mockResolvedValue(null); const mockRetryProvisioning = jest.fn().mockResolvedValue(null);
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ colors: { background: '#fff', textPrimary: '#111', textSecondary: '#555', accent: '#b28c6e' }, typography: { fontFamily: { bold: 'System' } } }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: mockLocale }) }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ completeEmailUpgrade: mockComplete, resendEmailUpgrade: mockResend, retryProvisioning: mockRetryProvisioning }) }));
jest.mock('@/contexts/AccountGateContext', () => ({ useAccountGate: () => ({ emailUpgradeCredentials: mockCredentials }) }));
jest.mock('@/components/account', () => { const { TouchableOpacity, Text } = require('react-native'); return { CodeInput: ({ onChange }: { onChange: (value: string) => void }) => <><TouchableOpacity testID="code-five" onPress={() => onChange('12345')}><Text>five</Text></TouchableOpacity><TouchableOpacity testID="code-six" onPress={() => onChange('123456')}><Text>six</Text></TouchableOpacity><TouchableOpacity testID="code-seven" onPress={() => onChange('1234567')}><Text>seven</Text></TouchableOpacity></> }; });
jest.mock('@/utils/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));
describe('VerifyScreen route contracts', () => { beforeEach(() => { jest.clearAllMocks(); mockLocale = 'fr'; mockCredentials = { email: 'a@b.com', password: 'Aa!123456' }; }); it('submits only a six digit code', async () => { const { getByTestId } = render(<VerifyScreen />); fireEvent.press(getByTestId('code-five')); fireEvent.press(getByTestId('verify-submit')); expect(mockComplete).not.toHaveBeenCalled(); fireEvent.press(getByTestId('code-seven')); fireEvent.press(getByTestId('verify-submit')); expect(mockComplete).not.toHaveBeenCalled(); fireEvent.press(getByTestId('code-six')); fireEvent.press(getByTestId('verify-submit')); await waitFor(() => expect(mockComplete).toHaveBeenCalledWith('a@b.com', 'Aa!123456', '123456')); expect(mockPush).toHaveBeenCalledWith('/survey'); }); it('shows the code error when OTP verification fails', async () => { mockComplete.mockResolvedValueOnce({ message: 'Token has expired' }); const { getByTestId, getByText } = render(<VerifyScreen />); fireEvent.press(getByTestId('code-six')); fireEvent.press(getByTestId('verify-submit')); await waitFor(() => expect(getByText('verify.error')).toBeTruthy()); }); it.each([
  'Password should be at least 6 characters',
  'Weak credential',
  'Must be at least 6 characters',
])('classe « %s » comme erreur de mot de passe distincte du code OTP', async (message) => {
  mockComplete.mockResolvedValueOnce({ message });
  const { getByTestId, getByText, queryByText } = render(<VerifyScreen />);
  fireEvent.press(getByTestId('code-six'));
  fireEvent.press(getByTestId('verify-submit'));
  await waitFor(() => expect(getByText('verify.errorWeakPassword')).toBeTruthy());
  expect(queryByText('verify.error')).toBeNull();
  expect(mockPush).not.toHaveBeenCalled();
}); it('shows a distinct recoverable error when provisioning fails after verification', async () => { mockComplete.mockResolvedValueOnce({ message: 'EMAIL_UPGRADE_PROVISIONING_FAILED' }); const { getByTestId, getByText, queryByText } = render(<VerifyScreen />); fireEvent.press(getByTestId('code-six')); fireEvent.press(getByTestId('verify-submit')); await waitFor(() => expect(getByText('verify.provisioningError')).toBeTruthy()); expect(queryByText('verify.error')).toBeNull(); expect(mockPush).not.toHaveBeenCalled(); }); it('retries provisioning without asking for the OTP again', async () => { mockComplete.mockResolvedValueOnce({ message: 'EMAIL_UPGRADE_PROVISIONING_FAILED' }); const { getByTestId, getByText } = render(<VerifyScreen />); fireEvent.press(getByTestId('code-six')); fireEvent.press(getByTestId('verify-submit')); await waitFor(() => expect(getByText('verify.provisioningError')).toBeTruthy()); fireEvent.press(getByTestId('verify-retry-provisioning')); await waitFor(() => expect(mockRetryProvisioning).toHaveBeenCalledTimes(1)); expect(mockComplete).toHaveBeenCalledTimes(1); expect(mockPush).toHaveBeenCalledWith('/survey'); }); it('resends and clears through the auth boundary with the active locale', async () => { const { getByText } = render(<VerifyScreen />); fireEvent.press(getByText('verify.resend')); await waitFor(() => expect(mockResend).toHaveBeenCalledWith('a@b.com', 'fr')); });

it('redirects to /account when opened without email/password in memory', () => {
  mockCredentials = null;
  render(<VerifyScreen />);
  expect(mockReplace).toHaveBeenCalledWith('/account');
  expect(mockReplace).toHaveBeenCalledTimes(1);
});

it('keeps the provisioning error visible after a second failed retry', async () => {
  mockComplete.mockResolvedValueOnce({ message: 'EMAIL_UPGRADE_PROVISIONING_FAILED' });
  mockRetryProvisioning.mockResolvedValueOnce({ message: 'EMAIL_UPGRADE_PROVISIONING_FAILED' });
  const { getByTestId, getByText } = render(<VerifyScreen />);
  fireEvent.press(getByTestId('code-six'));
  fireEvent.press(getByTestId('verify-submit'));
  await waitFor(() => expect(getByText('verify.provisioningError')).toBeTruthy());

  fireEvent.press(getByTestId('verify-retry-provisioning'));
  await waitFor(() => expect(mockRetryProvisioning).toHaveBeenCalledTimes(1));
  expect(getByText('verify.provisioningError')).toBeTruthy();
  expect(getByTestId('verify-retry-provisioning')).toBeTruthy();
  expect(mockPush).not.toHaveBeenCalledWith('/survey');
}); });
