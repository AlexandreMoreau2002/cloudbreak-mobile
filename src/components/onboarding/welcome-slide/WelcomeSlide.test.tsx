import { render, fireEvent, configure } from '@testing-library/react-native';
import i18n from '@/utils/i18n';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { WelcomeSlide } from '@/components/onboarding/welcome-slide/WelcomeSlide';

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

 it.each([true, false])('renders the eyebrow only in development (%s)', (dev) => {
   const previous = __DEV__;
   Object.defineProperty(globalThis, '__DEV__', { value: dev, configurable: true, writable: true });
   try {
     const { queryByText } = renderWithTheme(<WelcomeSlide onContinue={() => {}} />);
     expect(Boolean(queryByText(i18n.t('onboarding.step1Eyebrow')))).toBe(dev);
   } finally {
     Object.defineProperty(globalThis, '__DEV__', { value: previous, configurable: true, writable: true });
   }
 });
