import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { PaywallProvider, usePaywall } from '@/contexts/PaywallContext';

const wrapper = ({ children }: { children: ReactNode }) => (
  <PaywallProvider>{children}</PaywallProvider>
);

describe('PaywallContext', () => {
  it('fournit_des_callbacks_par_defaut_hors_provider', () => {
    const { result } = renderHook(() => usePaywall());

    expect(result.current.paywallVisible).toBe(false);
    expect(() => result.current.showPaywall()).not.toThrow();
    expect(() => result.current.hidePaywall()).not.toThrow();
  });

  it('affiche_puis_masque_le_paywall_depuis_le_provider', () => {
    const { result } = renderHook(() => usePaywall(), { wrapper });

    expect(result.current.paywallVisible).toBe(false);

    act(() => {
      result.current.showPaywall();
    });

    expect(result.current.paywallVisible).toBe(true);

    act(() => {
      result.current.hidePaywall();
    });

    expect(result.current.paywallVisible).toBe(false);
  });
});
