import { render } from '@testing-library/react-native';
import { LoadingSpinner } from './LoadingSpinner';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { accent: '#B28C6E' },
  }),
}));

describe('LoadingSpinner', () => {
  it('se rend sans erreur', () => {
    const { getByTestId } = render(<LoadingSpinner />);
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('accepte size="small" sans erreur', () => {
    const { getByTestId } = render(<LoadingSpinner size="small" />);
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });
});
