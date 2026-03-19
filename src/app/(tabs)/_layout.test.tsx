import React from 'react';
import TabsLayout from './_layout';
import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createElement, Fragment } = require('react');
  const MockScreen = (props: { options?: { tabBarIcon?: (p: { color: string }) => unknown } }) => {
    const icon = props.options?.tabBarIcon?.({ color: '#000' });
    return icon ? createElement(Fragment, null, icon) : null;
  };
  const MockTabs = ({ children }: { children: unknown }) => createElement(View, null, children);
  MockTabs.Screen = MockScreen;
  return { Tabs: MockTabs };
});

jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
}));

jest.mock('@/utils/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      surface: '#F7F5F1',
      border: '#E9E4DA',
      accent: '#B28C6E',
      textDisabled: '#A0A0A0',
    },
    typography: {
      fontFamily: { semiBold: 'semiBold' },
    },
  }),
}));

describe('TabsLayout', () => {
  it('s\'affiche sans erreur et couvre TabIcon', () => {
    const { toJSON } = render(<TabsLayout />);
    expect(toJSON()).toBeTruthy();
  });
});
