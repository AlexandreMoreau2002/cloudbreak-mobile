import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import SurveyScreen from '@/app/survey';
const mockSave = jest.fn().mockResolvedValue(null); const mockFinish = jest.fn().mockResolvedValue(undefined); const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ colors: { background: '#fff' } }) }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ saveSurvey: mockSave }) }));
jest.mock('@/contexts/AccountGateContext', () => ({ useAccountGate: () => ({ pendingAction: { kind: 'favorite', peakId: 'peak-1' }, finishAccountCreation: mockFinish }) }));
jest.mock('@/components/account', () => { const { TouchableOpacity, Text } = require('react-native'); return { SurveyForm: ({ onSubmit }: { onSubmit: (answer: object) => void }) => <TouchableOpacity testID="submit" onPress={() => onSubmit({ acquisitionSource: 'app_store' })}><Text>submit</Text></TouchableOpacity> }; });
jest.mock('@/components/loading-spinner', () => ({ LoadingSpinner: () => null }));
jest.mock('@/utils/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));
describe('SurveyScreen route contracts', () => {
  beforeEach(() => jest.clearAllMocks());

  afterEach(() => jest.useRealTimers());

  it('saves typed answers then replays the pending action', async () => { const { getByTestId } = render(<SurveyScreen />); fireEvent.press(getByTestId('submit')); await waitFor(() => expect(mockSave).toHaveBeenCalledWith({ acquisitionSource: 'app_store' })); expect(mockFinish).toHaveBeenCalled(); });

  it('skips with the explicit skipped payload', async () => { const { getByTestId } = render(<SurveyScreen />); fireEvent.press(getByTestId('survey-skip')); await waitFor(() => expect(mockSave).toHaveBeenCalledWith({ skipped: true })); });

  it('keeps the account-created badge visible for four seconds, then removes it after its exit fade', () => {
    jest.useFakeTimers();
    const { getByText, queryByText } = render(<SurveyScreen />);

    expect(getByText('survey.created')).toBeTruthy();

    act(() => jest.advanceTimersByTime(3_999));
    expect(getByText('survey.created')).toBeTruthy();

    act(() => jest.advanceTimersByTime(251));
    expect(queryByText('survey.created')).toBeNull();
  });
});
