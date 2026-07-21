import { SplashView } from './SplashView';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { act, render, configure } from '@testing-library/react-native';

configure({ defaultIncludeHiddenElements: true });

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('SplashView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('does not call onDone before 1800ms', () => {
    const onDone = jest.fn();
    renderWithTheme(<SplashView onDone={onDone} />);
    act(() => {
      jest.advanceTimersByTime(1799);
    });
    expect(onDone).not.toHaveBeenCalled();
  });

  it('calls onDone once at 1800ms', () => {
    const onDone = jest.fn();
    renderWithTheme(<SplashView onDone={onDone} />);
    act(() => {
      jest.advanceTimersByTime(1800);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('never calls onDone when unmounted before 1800ms', () => {
    const onDone = jest.fn();
    const { unmount } = renderWithTheme(<SplashView onDone={onDone} />);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    unmount();
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(onDone).not.toHaveBeenCalled();
  });
});
