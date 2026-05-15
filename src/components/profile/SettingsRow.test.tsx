import React from 'react';
import { SettingsRow } from './SettingsRow';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { border: '#E9E4DA', textPrimary: '#1A1A1A', textSecondary: '#5E5E5E' },
    typography: { fontFamily: { regular: 'regular' } },
  }),
}));

describe('SettingsRow', () => {
  const defaultProps = {
    icon: 'sunny-outline' as const,
    label: 'Apparence',
    value: 'Clair',
    onPress: jest.fn(),
  };

  it('affiche le label et la valeur', () => {
    const { getByText } = render(<SettingsRow {...defaultProps} />);
    expect(getByText('Apparence')).toBeTruthy();
    expect(getByText('Clair')).toBeTruthy();
  });

  it('appelle onPress au tap', () => {
    const onPress = jest.fn();
    const { getByText } = render(<SettingsRow {...defaultProps} onPress={onPress} />);
    fireEvent.press(getByText('Apparence'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
