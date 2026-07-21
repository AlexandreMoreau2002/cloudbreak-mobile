import { CloudCurtain } from './CloudCurtain';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { act, render, configure } from '@testing-library/react-native';

// L'overlay est masqué de l'accessibilité (rideau décoratif) — on inclut les
// éléments cachés pour pouvoir interroger le testID.
configure({ defaultIncludeHiddenElements: true });

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('CloudCurtain', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    const { getByTestId } = renderWithTheme(
      <CloudCurtain onSwap={jest.fn()} onDone={jest.fn()} />,
    );
    expect(getByTestId('cloud-curtain')).toBeTruthy();
  });

  it('fires onSwap at 880ms and not a millisecond before', () => {
    const onSwap = jest.fn();
    renderWithTheme(<CloudCurtain onSwap={onSwap} onDone={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(879);
    });
    expect(onSwap).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onSwap).toHaveBeenCalledTimes(1);
  });

  it('fires onDone at 2500ms and not a millisecond before', () => {
    const onDone = jest.fn();
    renderWithTheme(<CloudCurtain onSwap={jest.fn()} onDone={onDone} />);

    act(() => {
      jest.advanceTimersByTime(2499);
    });
    expect(onDone).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('fires each callback at most once over the whole timeline', () => {
    const onSwap = jest.fn();
    const onDone = jest.fn();
    renderWithTheme(<CloudCurtain onSwap={onSwap} onDone={onDone} />);

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(onSwap).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('fires neither callback after unmount', () => {
    const onSwap = jest.fn();
    const onDone = jest.fn();
    const { unmount } = renderWithTheme(
      <CloudCurtain onSwap={onSwap} onDone={onDone} />,
    );

    unmount();
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(onSwap).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});
