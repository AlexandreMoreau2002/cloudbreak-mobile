import i18n from '@/utils/i18n';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationsSlide } from './NotificationsSlide';
import { act, configure, fireEvent, render } from '@testing-library/react-native';
import { useNotificationPermission } from '@/hooks/onboarding/useNotificationPermission';

jest.mock('@/hooks/onboarding/useNotificationPermission');
jest.mock('@/services/analytics', () => ({ track: jest.fn() }));

// Le fil d'Ariane (MascotBreadcrumb) est masqué de l'accessibilité — inclure les
// éléments cachés pour pouvoir l'interroger (même convention que SummitSlide).
configure({ defaultIncludeHiddenElements: true });

const mockUseNotificationPermission = useNotificationPermission as jest.Mock;

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('NotificationsSlide', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the i18n texts (title card, app label)', () => {
    mockUseNotificationPermission.mockReturnValue({ requestPermission: jest.fn() });
    const { getByText, getAllByText } = renderWithTheme(<NotificationsSlide onGoNext={() => {}} />);

    expect(getByText(i18n.t('onboarding.notifPreviewTitle1'))).toBeTruthy();
    expect(getAllByText(i18n.t('onboarding.notifPreviewApp')).length).toBe(2);
  });

  it('requests permission then finishes when the user allows (granted)', async () => {
    const { track } = jest.requireMock('@/services/analytics');
    const requestPermission = jest.fn().mockResolvedValue(true);
    mockUseNotificationPermission.mockReturnValue({ requestPermission });
    const onGoNext = jest.fn();
    const { getByTestId } = renderWithTheme(<NotificationsSlide onGoNext={onGoNext} />);

    await fireEvent.press(getByTestId('notif-allow'));

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(onGoNext).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('onboarding_permission_result', { granted: true });
  });

  it('still finishes when the permission is denied (zero friction, AC 3)', async () => {
    const { track } = jest.requireMock('@/services/analytics');
    const requestPermission = jest.fn().mockResolvedValue(false);
    mockUseNotificationPermission.mockReturnValue({ requestPermission });
    const onGoNext = jest.fn();
    const { getByTestId } = renderWithTheme(<NotificationsSlide onGoNext={onGoNext} />);

    await fireEvent.press(getByTestId('notif-allow'));

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(onGoNext).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('onboarding_permission_result', { granted: false });
  });

  it('ignores a double-tap while the permission request is pending', async () => {
    let resolvePermission: (granted: boolean) => void = () => {};
    const requestPermission = jest.fn(
      () => new Promise<boolean>((resolve) => { resolvePermission = resolve; }),
    );
    mockUseNotificationPermission.mockReturnValue({ requestPermission });
    const onGoNext = jest.fn();
    const { getByTestId } = renderWithTheme(<NotificationsSlide onGoNext={onGoNext} />);

    fireEvent.press(getByTestId('notif-allow'));
    fireEvent.press(getByTestId('notif-allow'));
    await act(async () => { resolvePermission(true); });

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(onGoNext).toHaveBeenCalledTimes(1);
  });

  it('finishes directly on skip, without requesting permission', () => {
    const requestPermission = jest.fn();
    mockUseNotificationPermission.mockReturnValue({ requestPermission });
    const onGoNext = jest.fn();
    const { getByTestId } = renderWithTheme(<NotificationsSlide onGoNext={onGoNext} />);

    fireEvent.press(getByTestId('notif-skip'));

    expect(requestPermission).not.toHaveBeenCalled();
    expect(onGoNext).toHaveBeenCalledTimes(1);
  });

  it('ignores a double-tap on skip', () => {
    const requestPermission = jest.fn();
    mockUseNotificationPermission.mockReturnValue({ requestPermission });
    const onGoNext = jest.fn();
    const { getByTestId } = renderWithTheme(<NotificationsSlide onGoNext={onGoNext} />);

    fireEvent.press(getByTestId('notif-skip'));
    fireEvent.press(getByTestId('notif-skip'));

    expect(requestPermission).not.toHaveBeenCalled();
    expect(onGoNext).toHaveBeenCalledTimes(1);
  });

  it('renders the mascot breadcrumb at step 2 (third of three)', () => {
    mockUseNotificationPermission.mockReturnValue({ requestPermission: jest.fn() });
    const { getByTestId } = renderWithTheme(<NotificationsSlide onGoNext={() => {}} />);

    expect(getByTestId('breadcrumb-stop-2-filled')).toBeTruthy();
  });

  it('tracks onboarding_step_viewed with step 3 on mount', () => {
    const { track } = jest.requireMock('@/services/analytics');
    mockUseNotificationPermission.mockReturnValue({ requestPermission: jest.fn() });
    renderWithTheme(<NotificationsSlide onGoNext={() => {}} />);
    expect(track).toHaveBeenCalledWith('onboarding_step_viewed', { step: 3 });
  });

  it('tracks onboarding_permission_result with granted false on skip', () => {
    const { track } = jest.requireMock('@/services/analytics');
    mockUseNotificationPermission.mockReturnValue({ requestPermission: jest.fn() });
    const onGoNext = jest.fn();
    const { getByTestId } = renderWithTheme(<NotificationsSlide onGoNext={onGoNext} />);

    fireEvent.press(getByTestId('notif-skip'));

    expect(track).toHaveBeenCalledWith('onboarding_permission_result', { granted: false });
    expect(onGoNext).toHaveBeenCalledTimes(1);
  });
});
