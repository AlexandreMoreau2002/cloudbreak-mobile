import React from 'react';
import { render } from '@testing-library/react-native';
import { MountainBackground } from '@/components/MountainBackground';

describe('MountainBackground', () => {
  it('s\'affiche avec l\'opacité par défaut (0.12)', () => {
    const { toJSON } = render(<MountainBackground />);
    const root = toJSON() as { props: { style: { opacity: number }[] } };
    const style = root.props.style.find((s: { opacity?: number }) => s.opacity !== undefined);
    expect(style?.opacity).toBe(0.12);
  });

  it('s\'affiche avec une opacité personnalisée', () => {
    const { toJSON } = render(<MountainBackground opacity={0.5} />);
    const root = toJSON() as { props: { style: { opacity: number }[] } };
    const style = root.props.style.find((s: { opacity?: number }) => s.opacity !== undefined);
    expect(style?.opacity).toBe(0.5);
  });

  it('a pointerEvents="none"', () => {
    const { toJSON } = render(<MountainBackground />);
    const root = toJSON() as { props: { pointerEvents: string } };
    expect(root.props.pointerEvents).toBe('none');
  });
});
