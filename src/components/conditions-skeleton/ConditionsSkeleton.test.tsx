import { render, screen } from '@testing-library/react-native';
import { ConditionsSkeleton } from '@/components/conditions-skeleton';

let mockScheme: 'light' | 'dark' = 'light';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    scheme: mockScheme,
    colors: { surface: '#F7F5F1', border: '#E9E4DA' },
  }),
}));

describe('ConditionsSkeleton', () => {
  it('rend le skeleton avec 3 widgets en theme clair', () => {
    mockScheme = 'light';
    render(<ConditionsSkeleton />);
    expect(screen.getByTestId('conditions-skeleton')).toBeTruthy();
    expect(screen.getByTestId('conditions-skeleton-widget-0')).toBeTruthy();
    expect(screen.getByTestId('conditions-skeleton-widget-1')).toBeTruthy();
    expect(screen.getByTestId('conditions-skeleton-widget-2')).toBeTruthy();
  });

  it('rend le skeleton en theme sombre', () => {
    mockScheme = 'dark';
    render(<ConditionsSkeleton />);
    expect(screen.getByTestId('conditions-skeleton')).toBeTruthy();
  });
});
