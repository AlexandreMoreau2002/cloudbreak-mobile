import React from 'react';
import SandboxScreen from '@/app/sandbox';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#EFE8DC',
      surface: '#F7F5F1',
      border: '#E9E4DA',
      accent: '#B28C6E',
      textPrimary: '#1A1A1A',
      textSecondary: '#5E5E5E',
    },
    typography: {
      fontFamily: { regular: 'regular', bold: 'bold' },
    },
  }),
}));

const mockCloudLayerViz = jest.fn((props: { variant?: string; isSunny?: boolean }) => (
  <Text testID="cloud-layer-viz">{props.isSunny ? 'sunny' : props.variant}</Text>
));

jest.mock('@/components/cloud-layer-viz', () => ({
  CloudLayerViz: (props: { variant?: string; isSunny?: boolean }) => mockCloudLayerViz(props),
}));

describe('SandboxScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('affiche les variantes CloudLayerViz et permet de revenir en arriere', () => {
    render(<SandboxScreen />);

    expect(screen.getByText('Retour')).toBeTruthy();
    expect(screen.getByText('CloudLayerViz')).toBeTruthy();
    expect(screen.getByText('Variante A · sommet au-dessus')).toBeTruthy();
    expect(screen.getByText('Variante B · marge serrée')).toBeTruthy();
    expect(screen.getByText('Variante C · nuage couvrant')).toBeTruthy();
    expect(screen.getByText('Variante D · ciel dégagé (WIP)')).toBeTruthy();
    expect(screen.getAllByTestId('cloud-layer-viz')).toHaveLength(4);

    expect(mockCloudLayerViz).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ variant: 'focus', showVariantLabel: true }),
    );
    expect(mockCloudLayerViz).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ variant: 'ridge', showVariantLabel: true }),
    );
    expect(mockCloudLayerViz).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        variant: 'minimal',
        showVariantLabel: true,
        viz: expect.objectContaining({ cloud_base: 2600 }),
      }),
    );
    expect(mockCloudLayerViz).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        isSunny: true,
        viz: { summit_altitude: 476, cloud_base: 5000, pressure_levels: [] },
      }),
    );

    fireEvent.press(screen.getByText('Retour'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
