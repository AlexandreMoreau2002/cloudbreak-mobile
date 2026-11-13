import { render, screen } from '@testing-library/react-native';
import { ScoreSkeleton } from '@/components/score-skeleton';

let mockScheme: 'light' | 'dark' = 'light';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    scheme: mockScheme,
    colors: {
      surface: mockScheme === 'dark' ? '#2A2A2A' : '#F7F5F1',
      border: mockScheme === 'dark' ? '#3A3A3A' : '#E9E4DA',
    },
  }),
}));

describe('ScoreSkeleton', () => {
  it('rend le skeleton en theme clair', () => {
    mockScheme = 'light';
    render(<ScoreSkeleton />);
    expect(screen.getByTestId('score-skeleton')).toBeTruthy();
  });

  it('rend le skeleton en theme sombre', () => {
    mockScheme = 'dark';
    render(<ScoreSkeleton />);
    expect(screen.getByTestId('score-skeleton')).toBeTruthy();
  });

  it('affiche 4 chips horaires', () => {
    mockScheme = 'light';
    render(<ScoreSkeleton />);
    expect(screen.getByTestId('score-skeleton-hour-0')).toBeTruthy();
    expect(screen.getByTestId('score-skeleton-hour-3')).toBeTruthy();
  });
});
