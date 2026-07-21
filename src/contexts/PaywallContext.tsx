import type { ReactNode } from 'react';
import { track } from '@/services/analytics';
import { useState, useCallback, useContext, createContext } from 'react';

export type PaywallTrigger = 'quota' | 'profile_banner' | 'home_badge' | 'unknown';

type PaywallContextValue = {
  paywallVisible: boolean;
  showPaywall: (trigger?: PaywallTrigger) => void;
  hidePaywall: () => void;
};

const PaywallContext = createContext<PaywallContextValue>({
  paywallVisible: false,
  showPaywall: () => {},
  hidePaywall: () => {},
});

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [paywallVisible, setPaywallVisible] = useState(false);

  const showPaywall = useCallback((trigger: PaywallTrigger = 'unknown') => {
    track('paywall_opened', { trigger });
    setPaywallVisible(true);
  }, []);
  const hidePaywall = useCallback(() => {
    track('paywall_dismissed');
    setPaywallVisible(false);
  }, []);

  return (
    <PaywallContext.Provider value={{ paywallVisible, showPaywall, hidePaywall }}>
      {children}
    </PaywallContext.Provider>
  );
}

export function usePaywall() {
  return useContext(PaywallContext);
}
