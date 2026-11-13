import React from 'react';
import { ProBanner } from './ProBanner';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    scheme: 'light',
    colors: { surface: '#F7F5F1', accent: '#B28C6E', textPrimary: '#1A1A1A', textSecondary: '#5E5E5E' },
    typography: { fontFamily: { regular: 'regular', semiBold: 'semiBold', bold: 'bold' } },
  }),
}));

describe('ProBanner', () => {
  const defaultProps = {
    label: 'CLOUDBREAK PRO',
    title: 'Consultez plus de sommets',
    subtitle: 'Prévisions illimitées',
    onPress: jest.fn(),
  };

  it('affiche le label, le titre et le sous-titre', () => {
    const { getByText } = render(<ProBanner {...defaultProps} />);
    expect(getByText('CLOUDBREAK PRO')).toBeTruthy();
    expect(getByText('Consultez plus de sommets')).toBeTruthy();
    expect(getByText('Prévisions illimitées')).toBeTruthy();
  });

  it('appelle onPress au tap', () => {
    const onPress = jest.fn();
    const { getByText } = render(<ProBanner {...defaultProps} onPress={onPress} />);
    fireEvent.press(getByText('Consultez plus de sommets'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
