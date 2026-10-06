import { useCallback, useEffect, useMemo } from 'react';
import { DEBUG } from '@/constants/devConfig';
import { useAccountGate } from '@/contexts/AccountGateContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, type SubscriptionProductId } from '@/contexts/SubscriptionContext';
import type { BillingPeriod, PaywallProduct } from '@/components/paywall/types';

const PRODUCT_BY_BILLING_PERIOD: Record<BillingPeriod, SubscriptionProductId> = {
  monthly: 'com.alexandremoreau.cloudbreak.premium.monthly',
  annual: 'com.alexandremoreau.cloudbreak.premium.annual',
};

function billingPeriodForProduct(productId: SubscriptionProductId): BillingPeriod {
  return productId === PRODUCT_BY_BILLING_PERIOD.monthly ? 'monthly' : 'annual';
}

export function useSubscriptionPurchase() {
  const { isAnonymous } = useAuth();
  const { requireAccount } = useAccountGate();
  const { isPremium, products, purchase, refresh, restore, state, waitForProduct } = useSubscription();

  const paywallProducts = useMemo<PaywallProduct[]>(() => products.map((product) => ({
    billingPeriod: billingPeriodForProduct(product.id),
    displayPrice: product.displayPrice,
    hasFreeTrial: product.hasFreeTrial,
  })), [products]);

  useEffect(() => {
    if (DEBUG) console.debug('[paywall] products received', { count: paywallProducts.length, prices: paywallProducts.map((product) => `${product.billingPeriod}:${product.displayPrice}`), isLoading: state.loading, error: state.error });
  }, [paywallProducts, state.loading, state.error]);

  const selectPlan = useCallback(async (billingPeriod: BillingPeriod): Promise<void> => {
    const productId = PRODUCT_BY_BILLING_PERIOD[billingPeriod];
    if (isAnonymous) {
      requireAccount({
        kind: 'subscription',
        productId,
        // AccountGate explicitly reads a fresh permanent session before it calls
        // this replay. The purchase provider also owns the actual StoreKit call.
        retry: async () => {
          if (await waitForProduct(productId)) await purchase(productId);
        },
      });
      return;
    }
    await purchase(productId);
  }, [isAnonymous, purchase, requireAccount, waitForProduct]);

  const restorePurchases = useCallback(async (): Promise<void> => {
    if (isAnonymous) {
      requireAccount({
        kind: 'subscription',
        productId: PRODUCT_BY_BILLING_PERIOD.annual,
        retry: restore,
      });
      return;
    }
    await restore();
  }, [isAnonymous, requireAccount, restore]);

  return {
    error: state.error,
    isLoading: state.loading,
    isPremium,
    products: paywallProducts,
    refresh,
    restore: restorePurchases,
    selectPlan,
  };
}
