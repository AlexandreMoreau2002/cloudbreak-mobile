import i18n from '@/utils/i18n';
import { WelcomeSlide } from './WelcomeSlide';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { render, fireEvent, configure } from '@testing-library/react-native';

jest.mock('@/services/analytics', () => ({ track: jest.fn() }));

// Le fil d'Ariane (MascotBreadcrumb) est masqué de l'accessibilité — inclure les
// éléments cachés pour pouvoir l'interroger.
configure({ defaultIncludeHiddenElements: true });

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('WelcomeSlide', () => {
  it('renders the localized title', () => {
    const { getByText } = renderWithTheme(<WelcomeSlide onContinue={() => {}} />);
    expect(getByText(i18n.t('onboarding.step1Title'))).toBeTruthy();
  });

  it('calls onContinue when the CTA is pressed', () => {
    const onContinue = jest.fn();
    const { getByTestId } = renderWithTheme(<WelcomeSlide onContinue={onContinue} />);
    fireEvent.press(getByTestId('welcome-continue'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('renders the breadcrumb', () => {
    const { getByTestId } = renderWithTheme(<WelcomeSlide onContinue={() => {}} />);
    expect(getByTestId('breadcrumb-mascot')).toBeTruthy();
  });

  it('tracks onboarding_step_viewed with step 1 on mount', () => {
    const { track } = jest.requireMock('@/services/analytics');
    renderWithTheme(<WelcomeSlide onContinue={() => {}} />);
    expect(track).toHaveBeenCalledWith('onboarding_step_viewed', { step: 1 });
  });
});
