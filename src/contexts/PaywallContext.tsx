import type { ReactNode } from 'react';
import { useState, useCallback, useContext, createContext } from 'react';

type PaywallContextValue = {
  paywallVisible: boolean;
  showPaywall: () => void;
  hidePaywall: () => void;
};

const PaywallContext = createContext<PaywallContextValue>({
  paywallVisible: false,
  showPaywall: () => {},
  hidePaywall: () => {},
});

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [paywallVisible, setPaywallVisible] = useState(false);

  const showPaywall = useCallback(() => setPaywallVisible(true), []);
  const hidePaywall = useCallback(() => setPaywallVisible(false), []);

  return (
    <PaywallContext.Provider value={{ paywallVisible, showPaywall, hidePaywall }}>
      {children}
    </PaywallContext.Provider>
  );
}

export function usePaywall() {
  return useContext(PaywallContext);
}
