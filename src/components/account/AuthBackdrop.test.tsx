import { configure, render } from '@testing-library/react-native';
import { processColor } from 'react-native';
import { FeGaussianBlur, Filter, Stop } from 'react-native-svg';
import { AuthBackdrop } from './AuthBackdrop';
import { useTheme } from '@/contexts/ThemeContext';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    scheme: 'light',
    colors: {
      background: '#EFE8DC',
    },
  })),
}));

configure({ defaultIncludeHiddenElements: true });

describe('AuthBackdrop', () => {
  const mockedUseTheme = useTheme as jest.Mock;
  const svgColorValue = (value: unknown) =>
    typeof value === 'object' && value !== null && 'payload' in value
      ? (value as { payload: number }).payload
      : value;

  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      scheme: 'light',
      colors: {
        background: '#EFE8DC',
      },
    });
  });

  it('renders the handoff composition: two ridges, three cloud bands and a fade', () => {
    const { getByTestId } = render(<AuthBackdrop />);

    expect(getByTestId('auth-backdrop')).toBeTruthy();
    expect(getByTestId('auth-backdrop-dawn')).toBeTruthy();
    expect(getByTestId('auth-backdrop-ridge-back')).toBeTruthy();
    expect(getByTestId('auth-backdrop-ridge-front')).toBeTruthy();
    expect(getByTestId('auth-backdrop-cloud-1')).toBeTruthy();
    expect(getByTestId('auth-backdrop-cloud-2')).toBeTruthy();
    expect(getByTestId('auth-backdrop-cloud-3')).toBeTruthy();
    expect(getByTestId('auth-backdrop')).toBeTruthy();
    expect(getByTestId('auth-backdrop-fade')).toBeTruthy();
  });

  it('keeps the artwork behind interactive content and uses the light handoff palette', () => {
    const { getByTestId } = render(<AuthBackdrop />);

    expect(getByTestId('auth-backdrop').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ zIndex: 1 })]),
    );
    expect(svgColorValue(getByTestId('auth-backdrop-ridge-back').props.fill)).toBe(processColor('#DCCDB4'));
    expect(svgColorValue(getByTestId('auth-backdrop-ridge-front').props.fill)).toBe(processColor('#CBB79B'));
    expect(svgColorValue(getByTestId('auth-backdrop-cloud-1').props.fill)).toBe(processColor('#FBF9F5'));
    expect(svgColorValue(getByTestId('auth-backdrop-cloud-2').props.fill)).toBe(processColor('#F7F5F1'));
    expect(svgColorValue(getByTestId('auth-backdrop-cloud-3').props.fill)).toBe(processColor('#FBF9F5'));
    expect(getByTestId('auth-backdrop-ridge-back').props.opacity).toBe(0.55);
    const view = render(<AuthBackdrop />);
    expect(view.UNSAFE_getByType(Filter).props.id).toBe('auth-backdrop-cloud-blur');
    expect(view.UNSAFE_getByType(FeGaussianBlur).props.stdDeviation).toBe(9);
  });

  it('fades to the theme background color, not a hardcoded light value', () => {
    const { UNSAFE_getAllByType } = render(<AuthBackdrop />);
    const fadeStops = UNSAFE_getAllByType(Stop).slice(-3);

    fadeStops.forEach((stop) => {
      expect(stop.props.stopColor).toBe('#EFE8DC');
    });

    mockedUseTheme.mockReturnValue({
      scheme: 'dark',
      colors: { background: '#171513' },
    });

    const { UNSAFE_getAllByType: getAllDark } = render(<AuthBackdrop />);
    const fadeStopsDark = getAllDark(Stop).slice(-3);

    fadeStopsDark.forEach((stop) => {
      expect(stop.props.stopColor).toBe('#171513');
    });
  });

  it('uses the dark handoff palette and lower cloud opacity', () => {
    mockedUseTheme.mockReturnValue({
      scheme: 'dark',
      colors: {
        background: '#171513',
      },
    });

    const { getByTestId } = render(<AuthBackdrop />);

    expect(svgColorValue(getByTestId('auth-backdrop-ridge-back').props.fill)).toBe(processColor('#262220'));
    expect(svgColorValue(getByTestId('auth-backdrop-ridge-front').props.fill)).toBe(processColor('#2E2823'));
    expect(svgColorValue(getByTestId('auth-backdrop-cloud-1').props.fill)).toBe(processColor('#3A3A3A'));
    expect(svgColorValue(getByTestId('auth-backdrop-cloud-2').props.fill)).toBe(processColor('#333333'));
    expect(svgColorValue(getByTestId('auth-backdrop-cloud-3').props.fill)).toBe(processColor('#2E2E2E'));
    expect(getByTestId('auth-backdrop-ridge-back').props.opacity).toBe(0.9);
    expect(getByTestId('auth-backdrop-cloud-bands').props.opacity).toBe(0.5);
  });
});
