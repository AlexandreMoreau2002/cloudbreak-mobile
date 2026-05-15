import { useState, useContext, createContext } from 'react';
import type { ReactNode } from 'react';

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

  return (
    <PaywallContext.Provider
      value={{
        paywallVisible,
        showPaywall: () => setPaywallVisible(true),
        hidePaywall: () => setPaywallVisible(false),
      }}
    >
      {children}
    </PaywallContext.Provider>
  );
}

export function usePaywall() {
  return useContext(PaywallContext);
}
