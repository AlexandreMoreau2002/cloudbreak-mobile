import React from 'react';
import { ScoreSkeleton } from '@/components/score-skeleton';
import { render, screen } from '@testing-library/react-native';

let mockScheme: 'light' | 'dark' = 'light';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    scheme: mockScheme,
    colors: {
      background: '#EFE8DC',
      surface: mockScheme === 'dark' ? '#2A2A2A' : '#F7F5F1',
      border: mockScheme === 'dark' ? '#3A3A3A' : '#E9E4DA',
      accent: '#B28C6E',
      accentSecondary: '#D2BA9C',
      textPrimary: mockScheme === 'dark' ? '#F7F5F1' : '#1A1A1A',
      textSecondary: '#5E5E5E',
      textDisabled: '#A0A0A0',
    },
  }),
}));

describe('ScoreSkeleton', () => {
  it('rend le skeleton en thème clair', () => {
    mockScheme = 'light';
    render(<ScoreSkeleton />);
    expect(screen.getByTestId('score-skeleton')).toBeTruthy();
  });

  it('rend le skeleton en thème sombre', () => {
    mockScheme = 'dark';
    render(<ScoreSkeleton />);
    expect(screen.getByTestId('score-skeleton')).toBeTruthy();
  });
});
