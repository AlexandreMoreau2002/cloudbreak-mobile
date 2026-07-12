import { render, screen } from '@testing-library/react-native';
import { HomeSkeleton } from '@/components/home-skeleton';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    scheme: 'light',
    colors: { surface: '#F7F5F1', border: '#E9E4DA' },
  }),
}));

describe('HomeSkeleton', () => {
  it('assemble tous les skeletons de la Home dans le bon ordre', () => {
    render(<HomeSkeleton />);
    expect(screen.getByTestId('home-skeleton')).toBeTruthy();
    expect(screen.getByTestId('peak-header-skeleton')).toBeTruthy();
    expect(screen.getByTestId('score-skeleton')).toBeTruthy();
    expect(screen.getByTestId('week-strip-skeleton')).toBeTruthy();
    expect(screen.getByTestId('conditions-skeleton')).toBeTruthy();
    expect(screen.getByTestId('favorites-grid-skeleton')).toBeTruthy();
  });
});
