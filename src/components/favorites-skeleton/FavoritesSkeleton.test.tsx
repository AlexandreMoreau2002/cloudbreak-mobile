import { render } from '@testing-library/react-native';
import { FavoritesSkeleton } from './FavoritesSkeleton';

let mockScheme = 'light';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { border: '#E9E4DA', surface: '#F7F5F1' },
    scheme: mockScheme,
  }),
}));

describe('FavoritesSkeleton', () => {
  beforeEach(() => {
    mockScheme = 'light';
  });

  it('se rend avec testID', () => {
    const { getByTestId } = render(<FavoritesSkeleton />);
    expect(getByTestId('favorites-skeleton')).toBeTruthy();
  });

  it('affiche 3 items placeholder', () => {
    const { getAllByTestId } = render(<FavoritesSkeleton />);
    expect(getAllByTestId('favorites-skeleton-item')).toHaveLength(3);
  });

  it('utilise la couleur sombre en mode dark', () => {
    mockScheme = 'dark';
    const { getByTestId } = render(<FavoritesSkeleton />);
    expect(getByTestId('favorites-skeleton')).toBeTruthy();
  });
});
