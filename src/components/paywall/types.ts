export type BillingPeriod = 'monthly' | 'annual';
export type PaywallPlan = BillingPeriod;

export interface PaywallScreenProps {
  visible: boolean;
  onDismiss: () => void;
  onSelectPlan?: (plan: BillingPeriod) => void;
}

export interface PaywallHeaderProps {
  colors: {
    accent: string;
    textPrimary: string;
    textSecondary: string;
  };
}

export interface PaywallBillingToggleProps {
  billingPeriod: BillingPeriod;
  onChangePeriod: (period: BillingPeriod) => void;
  colors: {
    accent: string;
    border: string;
    textPrimary: string;
  };
}

export interface PaywallCTAProps {
  billingPeriod: BillingPeriod;
  onSelectPlan: (plan: BillingPeriod) => void;
  colors: {
    accent: string;
    textSecondary: string;
  };
}

export interface PaywallFooterProps {
  onDismiss: () => void;
  colors: {
    textSecondary: string;
    border: string;
  };
}
