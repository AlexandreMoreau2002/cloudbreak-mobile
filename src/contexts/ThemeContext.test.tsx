import React from 'react';
import { Text } from 'react-native';
import { ThemeProvider, useTheme } from './ThemeContext';
import { render, fireEvent } from '@testing-library/react-native';

const mockUseColorScheme = jest.fn().mockReturnValue('light');

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: () => mockUseColorScheme(),
}));

function TestConsumer() {
  const { colors, scheme, toggleScheme } = useTheme();
  return (
    <>
      <Text testID="scheme">{scheme}</Text>
      <Text testID="bg">{colors.background}</Text>
      <Text testID="accent">{colors.accent}</Text>
      <Text testID="toggle" onPress={toggleScheme}>toggle</Text>
    </>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fournit le thème light', () => {
    mockUseColorScheme.mockReturnValue('light');
    const { getByTestId } = render(
      <ThemeProvider><TestConsumer /></ThemeProvider>
    );
    expect(getByTestId('scheme').props.children).toBe('light');
    expect(getByTestId('bg').props.children).toBe('#EFE8DC');
    expect(getByTestId('accent').props.children).toBe('#B28C6E');
  });

  it('fournit le thème dark', () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { getByTestId } = render(
      <ThemeProvider><TestConsumer /></ThemeProvider>
    );
    expect(getByTestId('scheme').props.children).toBe('dark');
    expect(getByTestId('bg').props.children).toBe('#1A1A1A');
    expect(getByTestId('accent').props.children).toBe('#B28C6E');
  });

  it('toggleScheme bascule de light à dark', () => {
    mockUseColorScheme.mockReturnValue('light');
    const { getByTestId } = render(
      <ThemeProvider><TestConsumer /></ThemeProvider>
    );
    expect(getByTestId('scheme').props.children).toBe('light');
    fireEvent.press(getByTestId('toggle'));
    expect(getByTestId('scheme').props.children).toBe('dark');
    fireEvent.press(getByTestId('toggle'));
    expect(getByTestId('scheme').props.children).toBe('light');
  });

  it('toggleScheme depuis dark (système) bascule vers light', () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { getByTestId } = render(
      <ThemeProvider><TestConsumer /></ThemeProvider>
    );
    expect(getByTestId('scheme').props.children).toBe('dark');
    fireEvent.press(getByTestId('toggle'));
    expect(getByTestId('scheme').props.children).toBe('light');
  });

  it('useTheme lance une erreur hors ThemeProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useTheme must be used within ThemeProvider');
    consoleError.mockRestore();
  });
});
