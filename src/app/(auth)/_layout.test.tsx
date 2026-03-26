import React from 'react';
import AuthLayout from '@/app/(auth)/_layout';
import { render } from '@testing-library/react-native';

const mockStack = jest.fn((_props: unknown) => null);

jest.mock('expo-router', () => ({
  Stack: (props: unknown) => {
    mockStack(props);
    return null;
  },
}));
describe('AuthLayout', () => {
  it('rend un Stack sans header', () => {
    render(<AuthLayout />);
    expect(mockStack).toHaveBeenCalledWith({ screenOptions: { headerShown: false } });
  });
});
