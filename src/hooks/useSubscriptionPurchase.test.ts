import { act, renderHook } from '@testing-library/react-native';
import { useSubscriptionPurchase } from '@/hooks/useSubscriptionPurchase';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountGate } from '@/contexts/AccountGateContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/contexts/AccountGateContext', () => ({ useAccountGate: jest.fn() }));
jest.mock('@/contexts/SubscriptionContext', () => ({ useSubscription: jest.fn() }));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseAccountGate = useAccountGate as jest.MockedFunction<typeof useAccountGate>;
const mockUseSubscription = useSubscription as jest.MockedFunction<typeof useSubscription>;

describe('useSubscriptionPurchase', () => {
  const purchase = jest.fn().mockResolvedValue(undefined);
  const waitForProduct = jest.fn().mockResolvedValue(true);
  const requireAccount = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccountGate.mockReturnValue({ requireAccount } as unknown as ReturnType<typeof useAccountGate>);
    mockUseSubscription.mockReturnValue({
      isPremium: false,
      products: [{ id: 'com.alexandremoreau.cloudbreak.premium.monthly', displayPrice: '4,99 $', period: 'month', hasFreeTrial: true }],
      purchase,
      refresh: jest.fn(),
      restore: jest.fn(),
      waitForProduct,
      state: { loading: false, error: null },
    } as unknown as ReturnType<typeof useSubscription>);
  });

  it('gates anonymous purchases before StoreKit and replays the exact product', async () => {
    mockUseAuth.mockReturnValue({ isAnonymous: true } as ReturnType<typeof useAuth>);
    let resolveCatalog: (ready: boolean) => void = () => {};
    waitForProduct.mockImplementationOnce(() => new Promise<boolean>((resolve) => { resolveCatalog = resolve; }));
    const { result } = renderHook(() => useSubscriptionPurchase());
    await act(async () => result.current.selectPlan('monthly'));
    expect(purchase).not.toHaveBeenCalled();
    const action = requireAccount.mock.calls[0][0];
    expect(action).toMatchObject({ kind: 'subscription', productId: 'com.alexandremoreau.cloudbreak.premium.monthly' });
    const replay = action.retry();
    expect(waitForProduct).toHaveBeenCalledWith('com.alexandremoreau.cloudbreak.premium.monthly');
    expect(purchase).not.toHaveBeenCalled();
    resolveCatalog(true);
    await replay;
    expect(purchase).toHaveBeenCalledWith('com.alexandremoreau.cloudbreak.premium.monthly');
  });

  it('calls StoreKit directly for a permanent user', async () => {
    mockUseAuth.mockReturnValue({ isAnonymous: false } as ReturnType<typeof useAuth>);
    const { result } = renderHook(() => useSubscriptionPurchase());
    await act(async () => result.current.selectPlan('annual'));
    expect(purchase).toHaveBeenCalledWith('com.alexandremoreau.cloudbreak.premium.annual');
  });

  it('gates restoration for an anonymous visitor instead of calling StoreKit', async () => {
    const restore = jest.fn().mockResolvedValue(undefined);
    mockUseSubscription.mockReturnValue({
      isPremium: false,
      products: [],
      purchase,
      refresh: jest.fn(),
      restore,
      waitForProduct,
      state: { loading: false, error: null },
    } as unknown as ReturnType<typeof useSubscription>);
    mockUseAuth.mockReturnValue({ isAnonymous: true } as ReturnType<typeof useAuth>);
    const { result } = renderHook(() => useSubscriptionPurchase());

    await act(async () => result.current.restore());

    expect(restore).not.toHaveBeenCalled();
    expect(requireAccount.mock.calls[0][0]).toMatchObject({ kind: 'subscription' });
    await requireAccount.mock.calls[0][0].retry();
    expect(restore).toHaveBeenCalledTimes(1);
  });
});
