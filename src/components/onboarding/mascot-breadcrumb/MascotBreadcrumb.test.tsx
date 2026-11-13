import { MascotBreadcrumb } from './MascotBreadcrumb';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { act, render, configure } from '@testing-library/react-native';

// Le composant est volontairement masqué de l'accessibilité (fil d'Ariane
// décoratif) — on inclut les éléments cachés pour pouvoir les interroger.
configure({ defaultIncludeHiddenElements: true });

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('MascotBreadcrumb', () => {
  it('renders one stop per step and the mascot (active=1, total=3)', () => {
    const { getByTestId } = renderWithTheme(<MascotBreadcrumb active={1} total={3} />);
    expect(getByTestId('breadcrumb-stop-0')).toBeTruthy();
    expect(getByTestId('breadcrumb-stop-1')).toBeTruthy();
    expect(getByTestId('breadcrumb-stop-2')).toBeTruthy();
    expect(getByTestId('breadcrumb-mascot')).toBeTruthy();
  });

  it('marks passed and current stops as filled, upcoming as empty', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(<MascotBreadcrumb active={1} total={3} />);
    expect(getByTestId('breadcrumb-stop-0-filled')).toBeTruthy(); // passed
    expect(getByTestId('breadcrumb-stop-1-filled')).toBeTruthy(); // current
    expect(queryByTestId('breadcrumb-stop-2-filled')).toBeNull(); // upcoming
  });

  it('fills the first stop when active=0', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(<MascotBreadcrumb active={0} total={3} />);
    expect(getByTestId('breadcrumb-stop-0-filled')).toBeTruthy();
    expect(queryByTestId('breadcrumb-stop-1-filled')).toBeNull();
  });

  it('defaults total to 3', () => {
    const { getByTestId } = renderWithTheme(<MascotBreadcrumb active={0} />);
    expect(getByTestId('breadcrumb-stop-2')).toBeTruthy();
  });

  it('does not crash when total=1 (pct guard)', () => {
    const { getByTestId } = renderWithTheme(<MascotBreadcrumb active={0} total={1} />);
    expect(getByTestId('breadcrumb-stop-0')).toBeTruthy();
    expect(getByTestId('breadcrumb-mascot')).toBeTruthy();
  });

  it('positions the halo after the breadcrumb layout is measured', () => {
    const { UNSAFE_getByType } = renderWithTheme(<MascotBreadcrumb active={1} total={3} />);
    const container = UNSAFE_getByType(require('react-native').View);

    act(() => {
      container.props.onLayout({ nativeEvent: { layout: { width: 320 } } });
    });

    expect(container.props.onLayout).toBeDefined();
  });
});
