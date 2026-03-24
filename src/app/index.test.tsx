import React from 'react';
import { render } from '@testing-library/react-native';
import Index from '@/app/index';

const mockRedirect = jest.fn((_props: unknown) => null);

jest.mock('expo-router', () => ({
  Redirect: (props: unknown) => {
    mockRedirect(props);
    return null;
  },
}));
describe('app/index', () => {
  it('redirige vers les tabs', () => {
    render(<Index />);
    expect(mockRedirect).toHaveBeenCalledWith({ href: '/(tabs)' });
  });
});
