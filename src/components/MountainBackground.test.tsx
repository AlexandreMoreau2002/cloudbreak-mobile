import React from 'react';
import { render } from '@testing-library/react-native';
import { MountainBackground } from './MountainBackground';

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

describe('MountainBackground', () => {
  it('s\'affiche avec l\'opacité par défaut', () => {
    const { toJSON } = render(<MountainBackground />);
    expect(toJSON()).toBeTruthy();
  });

  it('s\'affiche avec une opacité personnalisée', () => {
    const { toJSON } = render(<MountainBackground opacity={0.5} />);
    expect(toJSON()).toBeTruthy();
  });
});
