import { configure, render } from '@testing-library/react-native';
import { AuthBackdrop } from './AuthBackdrop';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#EFE8DC',
      accentSecondary: '#D2BA9C',
      accent: '#B28C6E',
      curtainSky: '#F7F2E6',
      curtain1: '#F4ECDF',
      curtain2: '#E9DDC7',
      curtainPeak: '#4A3A2C',
    },
  }),
}));

configure({ defaultIncludeHiddenElements: true });

describe('AuthBackdrop', () => {
  it('renders the handoff composition: two ridges, three cloud bands and a fade', () => {
    const { getByTestId } = render(<AuthBackdrop />);

    expect(getByTestId('auth-backdrop')).toBeTruthy();
    expect(getByTestId('auth-backdrop-dawn')).toBeTruthy();
    expect(getByTestId('auth-backdrop-ridge-back')).toBeTruthy();
    expect(getByTestId('auth-backdrop-ridge-front')).toBeTruthy();
    expect(getByTestId('auth-backdrop-cloud-1')).toBeTruthy();
    expect(getByTestId('auth-backdrop-cloud-2')).toBeTruthy();
    expect(getByTestId('auth-backdrop-cloud-3')).toBeTruthy();
    expect(getByTestId('auth-backdrop-fade')).toBeTruthy();
  });
});
