import i18n from '@/utils/i18n';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LocationSlide } from './LocationSlide';
import { act, configure, fireEvent, render } from '@testing-library/react-native';
import { useLocationPermission } from '@/hooks/onboarding/useLocationPermission';

jest.mock('@/hooks/onboarding/useLocationPermission', () => ({ useLocationPermission: jest.fn() }));
jest.mock('@/services/analytics', () => ({ track: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

configure({ defaultIncludeHiddenElements: true });

const mockUseLocationPermission = useLocationPermission as jest.Mock;

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('LocationSlide', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the i18n texts (title, body, caption)', () => {
    mockUseLocationPermission.mockReturnValue({ requestPermission: jest.fn() });
    const { getByText } = renderWithTheme(<LocationSlide onFinish={() => {}} />);

    expect(getByText(i18n.t('onboarding.step4Title'))).toBeTruthy();
    expect(getByText(i18n.t('onboarding.step4Body'))).toBeTruthy();
    expect(getByText(i18n.t('onboarding.locationPreviewCaption'))).toBeTruthy();
  });

  it('requests permission then finishes when the user allows (granted)', async () => {
    const { track } = jest.requireMock('@/services/analytics');
    const requestPermission = jest.fn().mockResolvedValue(true);
    mockUseLocationPermission.mockReturnValue({ requestPermission });
    const onFinish = jest.fn();
    const { getByTestId } = renderWithTheme(<LocationSlide onFinish={onFinish} />);

    await fireEvent.press(getByTestId('location-allow'));

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('onboarding_permission_result', { type: 'location', granted: true });
  });

  it('still finishes when the permission is denied (zero friction, AC 2)', async () => {
    const { track } = jest.requireMock('@/services/analytics');
    const requestPermission = jest.fn().mockResolvedValue(false);
    mockUseLocationPermission.mockReturnValue({ requestPermission });
    const onFinish = jest.fn();
    const { getByTestId } = renderWithTheme(<LocationSlide onFinish={onFinish} />);

    await fireEvent.press(getByTestId('location-allow'));

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('onboarding_permission_result', { type: 'location', granted: false });
  });

  it('ignores a double-tap while the permission request is pending', async () => {
    let resolvePermission: (granted: boolean) => void = () => {};
    const requestPermission = jest.fn(
      () => new Promise<boolean>((resolve) => { resolvePermission = resolve; }),
    );
    mockUseLocationPermission.mockReturnValue({ requestPermission });
    const onFinish = jest.fn();
    const { getByTestId } = renderWithTheme(<LocationSlide onFinish={onFinish} />);

    fireEvent.press(getByTestId('location-allow'));
    fireEvent.press(getByTestId('location-allow'));
    await act(async () => { resolvePermission(true); });

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('finishes directly on skip, without requesting permission', () => {
    const { track } = jest.requireMock('@/services/analytics');
    const requestPermission = jest.fn();
    mockUseLocationPermission.mockReturnValue({ requestPermission });
    const onFinish = jest.fn();
    const { getByTestId } = renderWithTheme(<LocationSlide onFinish={onFinish} />);

    fireEvent.press(getByTestId('location-skip'));

    expect(requestPermission).not.toHaveBeenCalled();
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('onboarding_permission_result', { type: 'location', granted: false });
  });

  it('ignores a double-tap on skip', () => {
    mockUseLocationPermission.mockReturnValue({ requestPermission: jest.fn() });
    const onFinish = jest.fn();
    const { getByTestId } = renderWithTheme(<LocationSlide onFinish={onFinish} />);

    fireEvent.press(getByTestId('location-skip'));
    fireEvent.press(getByTestId('location-skip'));

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('renders the mascot breadcrumb at step 3 (fourth of four)', () => {
    mockUseLocationPermission.mockReturnValue({ requestPermission: jest.fn() });
    const { getByTestId } = renderWithTheme(<LocationSlide onFinish={() => {}} />);

    expect(getByTestId('breadcrumb-stop-3-filled')).toBeTruthy();
  });

  it('tracks onboarding_step_viewed with step 4 on mount', () => {
    const { track } = jest.requireMock('@/services/analytics');
    mockUseLocationPermission.mockReturnValue({ requestPermission: jest.fn() });
    renderWithTheme(<LocationSlide onFinish={() => {}} />);
    expect(track).toHaveBeenCalledWith('onboarding_step_viewed', { step: 4 });
  });
});
