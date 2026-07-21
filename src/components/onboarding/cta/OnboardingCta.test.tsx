import { useEffect } from 'react';
import { Colors } from '@/constants/colors';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { render, fireEvent } from '@testing-library/react-native';
import { OnboardingCta, buildContainerStyle } from './OnboardingCta';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

// Force le thème sombre : bascule une fois au montage (défaut système = light).
function ForceDark({ children }: { children: React.ReactNode }) {
  const { scheme, toggleScheme } = useTheme();
  useEffect(() => {
    if (scheme !== 'dark') toggleScheme();
  }, [scheme, toggleScheme]);
  return <>{children}</>;
}

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.flat().map(flattenStyle));
  return (style ?? {}) as Record<string, unknown>;
}

describe('OnboardingCta', () => {
  it('renders the label in uppercase-friendly form', () => {
    const { getByText } = renderWithTheme(
      <OnboardingCta label="Continuer" onPress={() => {}} />,
    );
    expect(getByText('Continuer')).toBeTruthy();
  });

  it('fires onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithTheme(
      <OnboardingCta label="Continuer" onPress={onPress} testID="cta" />,
    );
    fireEvent.press(getByTestId('cta'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the ghost variant', () => {
    const { getByText } = renderWithTheme(
      <OnboardingCta label="Plus tard" onPress={() => {}} variant="ghost" />,
    );
    expect(getByText('Plus tard')).toBeTruthy();
  });

  it('renders the arrow when showArrow is set', () => {
    const { getByText } = renderWithTheme(
      <OnboardingCta label="Continuer" onPress={() => {}} showArrow />,
    );
    expect(getByText('Continuer')).toBeTruthy();
  });

  it('applies the pressed style (translateY 1 + dim) when pressed', () => {
    const pressed = flattenStyle(buildContainerStyle(true, false, Colors.light));
    expect(pressed.opacity).toBe(0.92);
    expect(pressed.transform).toEqual([{ translateY: 1 }]);

    const idle = flattenStyle(buildContainerStyle(false, false, Colors.light));
    expect(idle.opacity).toBeUndefined();
  });

  it('builds the ghost container (44px, transparent, bordered)', () => {
    const ghost = flattenStyle(buildContainerStyle(false, true, Colors.light));
    expect(ghost.height).toBe(44);
    expect(ghost.backgroundColor).toBe('transparent');
    expect(ghost.borderColor).toBe(Colors.light.border);
  });

  it('uses the inverse ink color in dark scheme', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ForceDark>
          <OnboardingCta label="Continuer" onPress={() => {}} />
        </ForceDark>
      </ThemeProvider>,
    );
    const flat = flattenStyle(getByText('Continuer').props.style);
    // primary + dark → encre = background sombre (#1A1A1A)
    expect(flat.color).toBe(Colors.dark.background);
  });
});
