import { AppState } from 'react-native';
import type { Purchase, ProductSubscription } from 'react-native-iap';
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
} from 'react-native-iap';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseClient';
import {
  fetchSubscription,
  verifySubscription,
  type SubscriptionResponse,
} from '@/services/api/subscription';

const PRODUCT_IDS = [
  'com.alexandremoreau.cloudbreak.premium.monthly',
  'com.alexandremoreau.cloudbreak.premium.annual',
] as const;

export type SubscriptionProductId = (typeof PRODUCT_IDS)[number];

export interface StoreKitProduct {
  id: SubscriptionProductId;
  displayPrice: string;
  period: 'month' | 'year' | null;
  hasFreeTrial: boolean;
}

export interface SubscriptionState extends SubscriptionResponse {
  loading: boolean;
  error: 'store_unavailable' | 'purchase_failed' | 'verification_failed' | null;
}

interface SubscriptionContextValue {
  state: SubscriptionState;
  products: StoreKitProduct[];
  isPremium: boolean;
  purchase: (productId: SubscriptionProductId) => Promise<void>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
  waitForProduct: (productId: SubscriptionProductId) => Promise<boolean>;
}

const FREE_STATE: SubscriptionState = {
  plan: 'free',
  status: 'none',
  expires_at: null,
  loading: false,
  error: null,
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function mapProduct(product: ProductSubscription): StoreKitProduct | null {
  if (product.platform !== 'ios' || !PRODUCT_IDS.includes(product.id as SubscriptionProductId) || !product.displayPrice) return null;
  const period = product.subscriptionPeriodUnitIOS === 'month'
    ? 'month'
    : product.subscriptionPeriodUnitIOS === 'year' ? 'year' : null;
  return {
    id: product.id as SubscriptionProductId,
    displayPrice: product.displayPrice,
    period,
    hasFreeTrial: product.introductoryPricePaymentModeIOS === 'free-trial'
      && product.introductoryPriceNumberOfPeriodsIOS === '1'
      && product.introductoryPriceSubscriptionPeriodIOS === 'week',
  };
}

function isCancellation(error: { code?: string } | null | undefined): boolean {
  return error?.code === 'E_USER_CANCELLED' || error?.code === 'user-cancelled';
}

function hasFutureExpiry(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const expiresAtMs = Date.parse(expiresAt);
  return Number.isFinite(expiresAtMs) && expiresAtMs > Date.now();
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { isAnonymous, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>(FREE_STATE);
  const [products, setProducts] = useState<StoreKitProduct[]>([]);
  const sessionRef = useRef(session);
  const productsRef = useRef<StoreKitProduct[]>([]);
  const storeInitialisationRef = useRef<Promise<void> | null>(null);
  const isPermanent = Boolean(session && !isAnonymous);

  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { productsRef.current = products; }, [products]);

  const refresh = useCallback(async (): Promise<void> => {
    const currentSession = sessionRef.current;
    if (!currentSession?.user || currentSession.user.is_anonymous) {
      setState(FREE_STATE);
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const subscription = await fetchSubscription(currentSession.access_token);
      setState({ ...subscription, loading: false, error: null });
    } catch {
      setState((current) => ({ ...current, loading: false, error: 'store_unavailable' }));
    }
  }, []);

  const verifyAndFinish = useCallback(async (purchase: Purchase): Promise<void> => {
    const { data } = await supabase.auth.getSession();
    const currentSession = data.session;
    if (!currentSession?.user || currentSession.user.is_anonymous || !purchase.purchaseToken) {
      setState((current) => ({ ...current, loading: false, error: 'verification_failed' }));
      return;
    }
    try {
      const subscription = await verifySubscription(currentSession.access_token, purchase.purchaseToken);
      await finishTransaction({ purchase, isConsumable: false });
      setState({ ...subscription, loading: false, error: null });
    } catch {
      setState((current) => ({ ...current, loading: false, error: 'verification_failed' }));
    }
  }, []);

  useEffect(() => {
    let active = true;
    const purchaseSubscription = purchaseUpdatedListener((purchase) => { void verifyAndFinish(purchase); });
    const errorSubscription = purchaseErrorListener((error) => {
      setState((current) => ({
        ...current,
        loading: false,
        error: isCancellation(error) ? null : 'purchase_failed',
      }));
    });

    async function initialiseStore(): Promise<void> {
      try {
        const connected = await initConnection();
        if (!connected || !active) throw new Error('StoreKit unavailable');
        const nativeProducts = await fetchProducts({ skus: [...PRODUCT_IDS], type: 'subs' });
        if (!active) return;
        setProducts((nativeProducts ?? []).flatMap((product) => {
          const mapped = mapProduct(product as ProductSubscription);
          return mapped ? [mapped] : [];
        }));
      } catch {
        if (active) setState((current) => ({ ...current, loading: false, error: 'store_unavailable' }));
      }
    }

    storeInitialisationRef.current = initialiseStore();
    return () => {
      active = false;
      purchaseSubscription.remove();
      errorSubscription.remove();
      void endConnection();
    };
  }, [verifyAndFinish]);

  useEffect(() => {
    if (isPermanent) void refresh();
    else setState(FREE_STATE);
  }, [isPermanent, refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const purchase = useCallback(async (productId: SubscriptionProductId): Promise<void> => {
    const { data } = await supabase.auth.getSession();
    const currentSession = data.session;
    if (!currentSession?.user || currentSession.user.is_anonymous || !productsRef.current.some((product) => product.id === productId)) {
      setState((current) => ({ ...current, error: 'store_unavailable' }));
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      await requestPurchase({
        type: 'subs',
        request: { apple: { sku: productId, appAccountToken: currentSession.user.id } },
      });
    } catch (error) {
      if (!isCancellation(error as { code?: string })) {
        setState((current) => ({ ...current, loading: false, error: 'purchase_failed' }));
      } else {
        setState((current) => ({ ...current, loading: false }));
      }
    }
  }, []);

  const restore = useCallback(async (): Promise<void> => {
    const { data } = await supabase.auth.getSession();
    const currentSession = data.session;
    if (!currentSession?.user || currentSession.user.is_anonymous) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const entitlements = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
      for (const entitlement of entitlements) await verifyAndFinish(entitlement);
      await refresh();
    } catch {
      setState((current) => ({ ...current, loading: false, error: 'store_unavailable' }));
    }
  }, [refresh, verifyAndFinish]);

  const waitForProduct = useCallback(async (productId: SubscriptionProductId): Promise<boolean> => {
    await storeInitialisationRef.current;
    return productsRef.current.some((product) => product.id === productId);
  }, []);

  const value = useMemo(() => ({
    state,
    products,
    purchase,
    restore,
    refresh,
    waitForProduct,
    isPremium: state.plan === 'premium'
      && (state.status === 'trial' || state.status === 'active')
      && hasFutureExpiry(state.expires_at),
  }), [products, purchase, refresh, restore, state, waitForProduct]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const value = useContext(SubscriptionContext);
  if (!value) throw new Error('useSubscription must be used within SubscriptionProvider');
  return value;
}
