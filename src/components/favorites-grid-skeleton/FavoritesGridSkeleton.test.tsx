import { render, screen } from '@testing-library/react-native';
import { FavoritesGridSkeleton } from '@/components/favorites-grid-skeleton';

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

describe('FavoritesGridSkeleton', () => {
  it('rend le skeleton avec 4 cartes en theme clair', () => {
    mockScheme = 'light';
    render(<FavoritesGridSkeleton />);
    expect(screen.getByTestId('favorites-grid-skeleton')).toBeTruthy();
    expect(screen.getByTestId('favorites-grid-skeleton-card-0')).toBeTruthy();
    expect(screen.getByTestId('favorites-grid-skeleton-card-3')).toBeTruthy();
  });

  it('rend le skeleton en theme sombre', () => {
    mockScheme = 'dark';
    render(<FavoritesGridSkeleton />);
    expect(screen.getByTestId('favorites-grid-skeleton')).toBeTruthy();
  });
});
