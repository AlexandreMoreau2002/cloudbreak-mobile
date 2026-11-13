export type BillingPeriod = 'monthly' | 'annual';
export type PaywallPlan = BillingPeriod;

export interface PaywallScreenProps {
  visible: boolean;
  onDismiss: () => void;
  products: PaywallProduct[];
  isLoading: boolean;
  error: PaywallPurchaseError | null;
  onSelectPlan: (plan: BillingPeriod) => Promise<void>;
  onRestore: () => Promise<void>;
  onRetryProducts: () => Promise<void>;
}

export interface PaywallProduct {
  billingPeriod: BillingPeriod;
  displayPrice: string;
  hasFreeTrial: boolean;
}

export type PaywallPurchaseError = 'store_unavailable' | 'purchase_failed' | 'verification_failed';

export interface PaywallHeaderProps {
  colors: {
    accent: string;
    textPrimary: string;
    textSecondary: string;
  };
  showTrial: boolean;
}

export interface PaywallBillingToggleProps {
  billingPeriod: BillingPeriod;
  onChangePeriod: (period: BillingPeriod) => void;
  colors: {
    accent: string;
    border: string;
    textPrimary: string;
  };
  products: PaywallProduct[];
}

export interface PaywallCTAProps {
  billingPeriod: BillingPeriod;
  product: PaywallProduct | null;
  isLoading: boolean;
  onSelectPlan: (plan: BillingPeriod) => Promise<void>;
  onRestore: () => Promise<void>;
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
