import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PaywallCTA } from './PaywallCTA';

jest.mock('@/services/analytics', () => ({ track: jest.fn() }));
jest.mock('@/utils/i18n', () => ({ t: (key: string) => key }));

describe('PaywallCTA', () => {
  it('does not invoke a native action while busy', () => {
    const onSelectPlan = jest.fn().mockResolvedValue(undefined);
    render(<PaywallCTA billingPeriod="annual" product={{ billingPeriod: 'annual', displayPrice: '44,99 €', hasFreeTrial: true }} isLoading onSelectPlan={onSelectPlan} onRestore={jest.fn()} colors={{ accent: '#000', textSecondary: '#111' }} />);
    fireEvent.press(screen.getByTestId('paywall-cta-button'));
    expect(onSelectPlan).not.toHaveBeenCalled();
  });
});
