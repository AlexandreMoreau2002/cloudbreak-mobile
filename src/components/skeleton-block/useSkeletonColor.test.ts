import { renderHook } from '@testing-library/react-native';
import { useSkeletonColor } from '@/components/skeleton-block';

let mockScheme: 'light' | 'dark' = 'light';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ scheme: mockScheme }),
}));

describe('useSkeletonColor', () => {
  it('retourne la couleur claire en theme light', () => {
    mockScheme = 'light';
    const { result } = renderHook(() => useSkeletonColor());
    expect(result.current).toBe('#DCCEBB');
  });

  it('retourne la couleur sombre en theme dark', () => {
    mockScheme = 'dark';
    const { result } = renderHook(() => useSkeletonColor());
    expect(result.current).toBe('#474747');
  });
});
