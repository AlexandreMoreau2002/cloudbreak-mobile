import { configure, render } from '@testing-library/react-native';
import { processColor } from 'react-native';
import { FeGaussianBlur, Filter } from 'react-native-svg';
import { AuthBackdrop } from './AuthBackdrop';
import { useTheme } from '@/contexts/ThemeContext';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    scheme: 'light',
    colors: {
      background: '#EFE8DC',
      accentSecondary: '#D2BA9C',
      accent: '#B28C6E',
      surface: '#F4ECDF',
      curtainSky: '#F7F2E6',
      curtain1: '#F4ECDF',
      curtain2: '#E9DDC7',
      curtainPeak: '#4A3A2C',
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
        accentSecondary: '#D2BA9C',
        accent: '#B28C6E',
        surface: '#F4ECDF',
        curtainSky: '#F7F2E6',
        curtain1: '#F4ECDF',
        curtain2: '#E9DDC7',
        curtainPeak: '#4A3A2C',
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
    expect(svgColorValue(getByTestId('auth-backdrop-ridge-back').props.fill)).toBe(processColor('#D2BA9C'));
    expect(svgColorValue(getByTestId('auth-backdrop-ridge-front').props.fill)).toBe(processColor('#B28C6E'));
    expect(svgColorValue(getByTestId('auth-backdrop-cloud-1').props.fill)).toBe(processColor('#F4ECDF'));
    expect(getByTestId('auth-backdrop-ridge-back').props.opacity).toBe(0.55);
    const view = render(<AuthBackdrop />);
    expect(view.UNSAFE_getByType(Filter).props.id).toBe('auth-backdrop-cloud-blur');
    expect(view.UNSAFE_getByType(FeGaussianBlur).props.stdDeviation).toBe(9);
  });

  it('uses the dark handoff palette and lower cloud opacity', () => {
    mockedUseTheme.mockReturnValue({
      scheme: 'dark',
      colors: {
        background: '#171513',
        accentSecondary: '#8A6A4C',
        accent: '#B28C6E',
        surface: '#3A3A3A',
        curtainSky: '#211D1A',
        curtain1: '#3A3A3A',
        curtain2: '#262220',
        curtainPeak: '#2E2823',
      },
    });

    const { getByTestId } = render(<AuthBackdrop />);

    expect(svgColorValue(getByTestId('auth-backdrop-ridge-back').props.fill)).toBe(processColor('#262220'));
    expect(svgColorValue(getByTestId('auth-backdrop-ridge-front').props.fill)).toBe(processColor('#2E2823'));
    expect(svgColorValue(getByTestId('auth-backdrop-cloud-1').props.fill)).toBe(processColor('#3A3A3A'));
    expect(getByTestId('auth-backdrop-ridge-back').props.opacity).toBe(0.9);
    expect(getByTestId('auth-backdrop-cloud-bands').props.opacity).toBe(0.5);
  });
});
