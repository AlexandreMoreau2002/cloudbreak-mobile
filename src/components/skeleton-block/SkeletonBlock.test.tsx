import { SkeletonBlock } from '@/components/skeleton-block';
import { render, screen, fireEvent } from '@testing-library/react-native';

describe('SkeletonBlock', () => {
  it('rend un bloc avec le testID fourni (sans layout, animation inactive)', () => {
    render(<SkeletonBlock testID="test-block" width={100} height={20} color="#E9E4DA" />);
    expect(screen.getByTestId('test-block')).toBeTruthy();
  });

  it('demarre le shimmer apres onLayout sans crash', () => {
    render(<SkeletonBlock testID="test-block" width={100} height={20} color="#E9E4DA" />);
    const block = screen.getByTestId('test-block');
    fireEvent(block, 'layout', { nativeEvent: { layout: { width: 100, height: 20 } } });
    expect(screen.getByTestId('test-block')).toBeTruthy();
  });

  it('arrete l\'animation au demontage apres layout', () => {
    const { unmount } = render(
      <SkeletonBlock testID="test-block" width={100} height={20} color="#E9E4DA" />,
    );
    fireEvent(screen.getByTestId('test-block'), 'layout', {
      nativeEvent: { layout: { width: 80, height: 20 } },
    });
    expect(() => unmount()).not.toThrow();
  });
});
