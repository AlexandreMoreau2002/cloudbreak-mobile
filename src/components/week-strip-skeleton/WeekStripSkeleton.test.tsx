import { render, screen } from '@testing-library/react-native';
import { WeekStripSkeleton } from '@/components/week-strip-skeleton';

let mockScheme: 'light' | 'dark' = 'light';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    scheme: mockScheme,
    colors: { surface: '#F7F5F1', border: '#E9E4DA' },
  }),
}));

describe('WeekStripSkeleton', () => {
  it('rend le skeleton avec 7 pastilles de jour en theme clair', () => {
    mockScheme = 'light';
    render(<WeekStripSkeleton />);
    expect(screen.getByTestId('week-strip-skeleton')).toBeTruthy();
    expect(screen.getByTestId('week-strip-skeleton-day-0')).toBeTruthy();
    expect(screen.getByTestId('week-strip-skeleton-day-6')).toBeTruthy();
  });

  it('rend le skeleton en theme sombre', () => {
    mockScheme = 'dark';
    render(<WeekStripSkeleton />);
    expect(screen.getByTestId('week-strip-skeleton')).toBeTruthy();
  });
});
