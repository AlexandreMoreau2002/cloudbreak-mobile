import * as Iap from 'react-native-iap';
import { AppState, Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseClient';
import { fetchSubscription, verifySubscription, type SubscriptionResponse } from '@/services/api/subscription';
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext';

jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/services/api/subscription', () => ({ fetchSubscription: jest.fn(), verifySubscription: jest.fn() }));
jest.mock('@/services/supabaseClient', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
const mockDevConfig = { DEBUG: false };
jest.mock('@/constants/devConfig', () => ({
  get DEBUG() { return mockDevConfig.DEBUG; },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockFetchSubscription = fetchSubscription as jest.MockedFunction<typeof fetchSubscription>;
const mockVerifySubscription = verifySubscription as jest.MockedFunction<typeof verifySubscription>;
const mockGetSession = supabase.auth.getSession as jest.MockedFunction<typeof supabase.auth.getSession>;
const iap = Iap as jest.Mocked<typeof Iap>;

let onPurchase: ((purchase: Iap.Purchase) => void) | undefined;
let onPurchaseError: ((error: Iap.PurchaseError) => void) | undefined;
let latest: ReturnType<typeof useSubscription> | undefined;

const FREE_RESPONSE: SubscriptionResponse = { plan: 'free', status: 'none', expires_at: null };
const PREMIUM_RESPONSE: SubscriptionResponse = { plan: 'premium', status: 'active', expires_at: '2099-01-01T00:00:00Z' };
const PURCHASE = { purchaseToken: 'signed-jws', productId: 'com.alexandremoreau.cloudbreak.premium.monthly' } as Iap.Purchase;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => { resolve = settle; });
  return { promise, resolve };
}

function appStateListener(nextState: string): void {
  (AppState.addEventListener as jest.Mock).mock.calls[0][1](nextState);
}

function Probe() {
  // eslint-disable-next-line react-hooks/globals -- capture volontaire de la valeur du hook dans un helper de test
  latest = useSubscription();
  return <Text>{latest.state.status}</Text>;
}

function setup(permanent = true): void {
  mockUseAuth.mockReturnValue({
    isAnonymous: !permanent,
    session: permanent ? { access_token: 'token', user: { id: 'account-id', is_anonymous: false } } : null,
  } as ReturnType<typeof useAuth>);
  mockFetchSubscription.mockResolvedValue(FREE_RESPONSE);
  mockGetSession.mockResolvedValue({
    data: { session: permanent ? { access_token: 'token', user: { id: 'account-id', is_anonymous: false } } : null },
    error: null,
  } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
  iap.initConnection.mockResolvedValue(true);
  iap.fetchProducts.mockResolvedValue([
    {
      id: 'com.alexandremoreau.cloudbreak.premium.monthly',
      displayPrice: '5,00 €',
      platform: 'ios',
      subscriptionPeriodUnitIOS: 'month',
      introductoryPricePaymentModeIOS: 'free-trial',
      introductoryPriceNumberOfPeriodsIOS: '1',
      introductoryPriceSubscriptionPeriodIOS: 'week',
    },
    {
      id: 'com.alexandremoreau.cloudbreak.premium.annual',
      displayPrice: '45,00 €',
      platform: 'ios',
      subscriptionPeriodUnitIOS: 'year',
      introductoryPricePaymentModeIOS: 'free-trial',
      introductoryPriceNumberOfPeriodsIOS: '1',
      introductoryPriceSubscriptionPeriodIOS: 'week',
    },
  ] as Iap.ProductSubscription[]);
  iap.purchaseUpdatedListener.mockImplementation((listener) => {
    onPurchase = listener;
    return { remove: jest.fn() };
  });
  iap.purchaseErrorListener.mockImplementation((listener) => {
    onPurchaseError = listener;
    return { remove: jest.fn() };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDevConfig.DEBUG = false;
  latest = undefined;
  onPurchase = undefined;
  onPurchaseError = undefined;
  setup();
});

function renderProvider() { return render(<SubscriptionProvider><Probe /></SubscriptionProvider>); }

describe('SubscriptionProvider', () => {
  it('trace le montage, le retour au premier plan et le refresh manuel', async () => {
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    mockDevConfig.DEBUG = true;
    renderProvider();
    await waitFor(() => expect(latest?.products).toHaveLength(2));
    act(() => { appStateListener('active'); });
    expect(mockFetchSubscription).toHaveBeenCalledTimes(1);
    await act(async () => { await latest?.refresh(); });

    expect(debugSpy.mock.calls.filter(([label]) => label === '[data-refresh]')).toEqual([
      ['[data-refresh]', { source: 'subscription', reason: 'mount-or-session', context: undefined }],
      ['[data-refresh]', { source: 'subscription', reason: 'manual', context: undefined }],
    ]);
    expect(JSON.stringify(debugSpy.mock.calls)).not.toMatch(/"token"|account-id|signed-jws/);
    debugSpy.mockRestore();
  });

  it('exposes a free state by default and loads both configured products once', async () => {
    renderProvider();
    await waitFor(() => expect(latest?.products).toHaveLength(2));
    expect(latest?.state.status).toBe('none');
    expect(iap.fetchProducts).toHaveBeenCalledWith({ skus: [
      'com.alexandremoreau.cloudbreak.premium.monthly',
      'com.alexandremoreau.cloudbreak.premium.annual',
    ], type: 'subs' });
    expect(latest?.products[0]).toMatchObject({ displayPrice: '5,00 €', period: 'month', hasFreeTrial: true });
  });

  it.each(['active', 'trial'] as const)('treats %s premium states as entitled', async (status) => {
    mockFetchSubscription.mockResolvedValueOnce({ plan: 'premium', status, expires_at: '2099-01-01T00:00:00Z' });
    renderProvider();
    await waitFor(() => expect(latest?.isPremium).toBe(true));
  });

  it('does not treat an expired premium response as entitled', async () => {
    mockFetchSubscription.mockResolvedValueOnce({ plan: 'premium', status: 'expired', expires_at: '2026-09-01T00:00:00Z' });
    renderProvider();
    await waitFor(() => expect(latest?.state.status).toBe('expired'));
    expect(latest?.isPremium).toBe(false);
  });

  it.each(['active', 'trial'] as const)('does not entitle an %s plan with a past expiry', async (status) => {
    mockFetchSubscription.mockResolvedValueOnce({ plan: 'premium', status, expires_at: '2000-01-01T00:00:00Z' });
    renderProvider();
    await waitFor(() => expect(latest?.state.status).toBe(status));
    expect(latest?.isPremium).toBe(false);
  });

  it('does not entitle a premium response with a malformed expiry', async () => {
    mockFetchSubscription.mockResolvedValueOnce({ plan: 'premium', status: 'active', expires_at: 'not-a-date' });
    renderProvider();
    await waitFor(() => expect(latest?.state.status).toBe('active'));
    expect(latest?.isPremium).toBe(false);
  });

  it('verifies StoreKit JWS before finishing a purchase', async () => {
    mockVerifySubscription.mockResolvedValue({ plan: 'premium', status: 'trial', expires_at: '2099-01-01T00:00:00Z' });
    renderProvider();
    await waitFor(() => expect(onPurchase).toBeDefined());
    const purchase = { purchaseToken: 'signed-jws', productId: 'com.alexandremoreau.cloudbreak.premium.monthly' } as Iap.Purchase;
    await act(async () => { onPurchase?.(purchase); });
    await waitFor(() => expect(iap.finishTransaction).toHaveBeenCalledWith({ purchase, isConsumable: false }));
    expect(mockVerifySubscription).toHaveBeenCalledWith('token', 'signed-jws');
  });

  it('does not finish a purchase when backend verification fails', async () => {
    mockVerifySubscription.mockRejectedValueOnce(new Error('invalid'));
    renderProvider();
    await waitFor(() => expect(onPurchase).toBeDefined());
    await act(async () => { onPurchase?.({ purchaseToken: 'signed-jws' } as Iap.Purchase); });
    await waitFor(() => expect(latest?.state.error).toBe('verification_failed'));
    expect(iap.finishTransaction).not.toHaveBeenCalled();
  });

  it('ends loading with a verification error when StoreKit omits the signed transaction', async () => {
    renderProvider();
    await waitFor(() => expect(latest?.products).toHaveLength(2));
    await act(async () => { await latest?.purchase('com.alexandremoreau.cloudbreak.premium.monthly'); });
    await act(async () => { onPurchase?.({ productId: 'com.alexandremoreau.cloudbreak.premium.monthly' } as Iap.Purchase); });
    await waitFor(() => expect(latest?.state).toMatchObject({ loading: false, error: 'verification_failed' }));
    expect(iap.finishTransaction).not.toHaveBeenCalled();
  });

  it('keeps purchasing available after a cancelled native sheet', async () => {
    iap.requestPurchase.mockRejectedValueOnce({ code: 'E_USER_CANCELLED' });
    renderProvider();
    await waitFor(() => expect(latest?.products).toHaveLength(2));
    await act(async () => { await latest?.purchase('com.alexandremoreau.cloudbreak.premium.monthly'); });
    expect(latest?.state.error).toBeNull();
    expect(iap.requestPurchase).toHaveBeenCalled();
  });

  it('clears loading without an error when the event-based native purchase is cancelled', async () => {
    renderProvider();
    await waitFor(() => expect(latest?.products).toHaveLength(2));
    await act(async () => { await latest?.purchase('com.alexandremoreau.cloudbreak.premium.monthly'); });
    expect(latest?.state.loading).toBe(true);
    act(() => { onPurchaseError?.({ code: Iap.ErrorCode.UserCancelled, message: 'cancelled' }); });
    await waitFor(() => expect(latest?.state).toMatchObject({ loading: false, error: null }));
  });

  it('clears loading with a generic error after an event-based native failure', async () => {
    renderProvider();
    await waitFor(() => expect(latest?.products).toHaveLength(2));
    await act(async () => { await latest?.purchase('com.alexandremoreau.cloudbreak.premium.monthly'); });
    expect(latest?.state.loading).toBe(true);
    act(() => { onPurchaseError?.({ code: Iap.ErrorCode.Unknown, message: 'failed' }); });
    await waitFor(() => expect(latest?.state).toMatchObject({ loading: false, error: 'purchase_failed' }));
  });

  it('verifies every active entitlement during restore', async () => {
    const first = { purchaseToken: 'first-jws' } as Iap.Purchase;
    const second = { purchaseToken: 'second-jws' } as Iap.Purchase;
    iap.getAvailablePurchases.mockResolvedValueOnce([first, second]);
    mockVerifySubscription.mockResolvedValue({ plan: 'premium', status: 'active', expires_at: '2099-01-01T00:00:00Z' });
    renderProvider();
    await waitFor(() => expect(latest).toBeDefined());
    await act(async () => { await latest?.restore(); });
    expect(mockVerifySubscription).toHaveBeenCalledWith('token', 'first-jws');
    expect(mockVerifySubscription).toHaveBeenCalledWith('token', 'second-jws');
  });

  it('loads the StoreKit catalog for anonymous visitors without reading their entitlement', async () => {
    setup(false);
    renderProvider();
    await waitFor(() => expect(latest?.products).toHaveLength(2));
    expect(iap.initConnection).toHaveBeenCalledTimes(1);
    expect(mockFetchSubscription).not.toHaveBeenCalled();
    expect(latest?.state.status).toBe('none');
  });

  it('does not advertise a trial unless StoreKit confirms one free week', async () => {
    iap.fetchProducts.mockResolvedValueOnce([{
      id: 'com.alexandremoreau.cloudbreak.premium.monthly',
      displayPrice: '5,00 €',
      platform: 'ios',
      subscriptionPeriodUnitIOS: 'month',
      introductoryPricePaymentModeIOS: 'free-trial',
      introductoryPriceNumberOfPeriodsIOS: '2',
      introductoryPriceSubscriptionPeriodIOS: 'week',
    }] as Iap.ProductSubscription[]);
    renderProvider();
    await waitFor(() => expect(latest?.products).toHaveLength(1));
    expect(latest?.products[0].hasFreeTrial).toBe(false);
  });
});

describe('SubscriptionProvider refresh freshness', () => {
  beforeEach(() => { jest.useFakeTimers({ now: new Date('2026-10-15T12:00:00Z') }); });
  afterEach(() => { jest.useRealTimers(); });

  it('ignore le foreground sous 60 secondes', async () => {
    mockFetchSubscription.mockResolvedValueOnce(PREMIUM_RESPONSE);
    renderProvider();
    await waitFor(() => expect(latest?.state.plan).toBe('premium'));
    expect(mockFetchSubscription).toHaveBeenCalledTimes(1);

    act(() => { jest.advanceTimersByTime(59_999); });
    act(() => { appStateListener('active'); });
    expect(mockFetchSubscription).toHaveBeenCalledTimes(1);
  });

  it('relit au foreground après 60 secondes', async () => {
    mockFetchSubscription.mockResolvedValueOnce(PREMIUM_RESPONSE);
    renderProvider();
    await waitFor(() => expect(latest?.state.plan).toBe('premium'));
    expect(mockFetchSubscription).toHaveBeenCalledTimes(1);

    act(() => { jest.advanceTimersByTime(60_000); });
    act(() => { appStateListener('active'); });
    await waitFor(() => expect(mockFetchSubscription).toHaveBeenCalledTimes(2));
  });

  it('force un refresh manuel malgré la fraîcheur du dernier GET', async () => {
    renderProvider();
    await waitFor(() => expect(mockFetchSubscription).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(latest?.state.loading).toBe(false));

    await act(async () => { await latest?.refresh(); });
    expect(mockFetchSubscription).toHaveBeenCalledTimes(2);
  });

  it('coalesce deux refresh forcés concurrents', async () => {
    const pending = deferred<SubscriptionResponse>();
    mockFetchSubscription.mockReturnValueOnce(pending.promise);
    renderProvider();

    await act(async () => { void latest?.refresh(); void latest?.refresh(); });
    expect(mockFetchSubscription).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve(FREE_RESPONSE); });
  });

  it('réessaie au foreground après un GET de montage en échec', async () => {
    mockFetchSubscription.mockRejectedValueOnce(new Error('offline'));
    renderProvider();
    await waitFor(() => expect(latest?.state.error).toBe('store_unavailable'));

    act(() => { appStateListener('active'); });
    await waitFor(() => expect(mockFetchSubscription).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(latest?.state.error).toBeNull());
  });

  it('ignore un GET ancien après une vérification StoreKit', async () => {
    const oldRead = deferred<SubscriptionResponse>();
    mockFetchSubscription.mockReturnValueOnce(oldRead.promise);
    mockVerifySubscription.mockResolvedValue(PREMIUM_RESPONSE);
    renderProvider();
    await waitFor(() => expect(onPurchase).toBeDefined());

    await act(async () => { onPurchase?.(PURCHASE); });
    await waitFor(() => expect(latest?.state.plan).toBe('premium'));
    await act(async () => { oldRead.resolve(FREE_RESPONSE); });
    expect(latest?.state).toMatchObject(PREMIUM_RESPONSE);
  });

  it('relit pour un autre compte et ignore le GET du compte précédent', async () => {
    const oldRead = deferred<SubscriptionResponse>();
    mockFetchSubscription.mockReturnValueOnce(oldRead.promise).mockResolvedValueOnce(PREMIUM_RESPONSE);
    const view = renderProvider();
    expect(mockFetchSubscription).toHaveBeenCalledTimes(1);

    mockUseAuth.mockReturnValue({
      isAnonymous: false,
      session: { access_token: 'other-token', user: { id: 'other-account', is_anonymous: false } },
    } as ReturnType<typeof useAuth>);
    view.rerender(<SubscriptionProvider><Probe /></SubscriptionProvider>);
    await waitFor(() => expect(mockFetchSubscription).toHaveBeenCalledWith('other-token'));
    await waitFor(() => expect(latest?.state.plan).toBe('premium'));

    await act(async () => { oldRead.resolve(FREE_RESPONSE); });
    expect(latest?.state).toMatchObject(PREMIUM_RESPONSE);
  });
});
