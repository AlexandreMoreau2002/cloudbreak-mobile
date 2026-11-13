import type { ReactNode } from 'react';
import { track } from '@/services/analytics';
import { act, renderHook } from '@testing-library/react-native';
import { PaywallProvider, usePaywall } from '@/contexts/PaywallContext';

jest.mock('@/services/analytics', () => ({ track: jest.fn() }));

const mockTrack = track as jest.Mock;

const wrapper = ({ children }: { children: ReactNode }) => (
  <PaywallProvider>{children}</PaywallProvider>
);

describe('PaywallContext', () => {
  beforeEach(() => jest.clearAllMocks());

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

  it('tracks paywall_opened with the given trigger', () => {
    const { result } = renderHook(() => usePaywall(), { wrapper });
    act(() => {
      result.current.showPaywall('quota');
    });
    expect(mockTrack).toHaveBeenCalledWith('paywall_opened', { trigger: 'quota' });
  });

  it('tracks paywall_opened with trigger unknown by default', () => {
    const { result } = renderHook(() => usePaywall(), { wrapper });
    act(() => {
      result.current.showPaywall();
    });
    expect(mockTrack).toHaveBeenCalledWith('paywall_opened', { trigger: 'unknown' });
  });

  it('tracks paywall_dismissed on hide', () => {
    const { result } = renderHook(() => usePaywall(), { wrapper });
    act(() => {
      result.current.hidePaywall();
    });
    expect(mockTrack).toHaveBeenCalledWith('paywall_dismissed');
  });
});
