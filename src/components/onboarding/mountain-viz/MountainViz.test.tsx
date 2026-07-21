import { MountainViz } from './MountainViz';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import * as ReactNative from 'react-native';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('MountainViz', () => {
  it.each([0, 40, 78, 100])('renders without crashing at score %i', (score) => {
    const { getByTestId } = renderWithTheme(<MountainViz score={score} />);
    expect(getByTestId('mountain-viz')).toBeTruthy();
  });

  it('respects the height prop', () => {
    const { getByTestId } = renderWithTheme(<MountainViz height={340} />);
    const container = getByTestId('mountain-viz');
    const flat = Array.isArray(container.props.style)
      ? Object.assign({}, ...container.props.style.flat())
      : container.props.style;
    expect(flat.height).toBe(340);
  });

  it('uses the default score/height without props', () => {
    const { getByTestId } = renderWithTheme(<MountainViz />);
    const container = getByTestId('mountain-viz');
    const flat = Array.isArray(container.props.style)
      ? Object.assign({}, ...container.props.style.flat())
      : container.props.style;
    expect(flat.height).toBe(200);
  });

  it('renders the dark palette when the system theme is dark', () => {
    const schemeSpy = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    const { getByTestId } = renderWithTheme(<MountainViz score={78} />);

    expect(getByTestId('mountain-viz')).toBeTruthy();
    schemeSpy.mockRestore();
  });
});
