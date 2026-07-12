import { render, screen } from '@testing-library/react-native';
import { PeakHeaderSkeleton } from '@/components/peak-header-skeleton';

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

describe('PeakHeaderSkeleton', () => {
  it('rend le skeleton avec son testID racine en theme clair', () => {
    mockScheme = 'light';
    render(<PeakHeaderSkeleton />);
    expect(screen.getByTestId('peak-header-skeleton')).toBeTruthy();
  });

  it('rend le skeleton en theme sombre', () => {
    mockScheme = 'dark';
    render(<PeakHeaderSkeleton />);
    expect(screen.getByTestId('peak-header-skeleton')).toBeTruthy();
  });
});
