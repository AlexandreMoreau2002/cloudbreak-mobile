import { apiFetch } from '@/services/fetchService';
import { fetchSubscription, verifySubscription } from '@/services/api/subscription';

jest.mock('@/services/fetchService', () => ({ apiFetch: jest.fn() }));

const TOKEN = 'permanent-access-token';
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

beforeEach(() => jest.clearAllMocks());

describe('subscription API', () => {
  it('fetches the current subscription with the permanent session token', async () => {
    const response = { plan: 'free' as const, status: 'none' as const, expires_at: null };
    mockApiFetch.mockResolvedValueOnce(response);

    await expect(fetchSubscription(TOKEN)).resolves.toEqual(response);

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/user/subscription', TOKEN);
  });

  it('verifies the signed StoreKit transaction with the permanent session token', async () => {
    const response = { plan: 'premium' as const, status: 'trial' as const, expires_at: '2026-10-06T00:00:00Z' };
    mockApiFetch.mockResolvedValueOnce(response);

    await expect(verifySubscription(TOKEN, 'signed-storekit-transaction')).resolves.toEqual(response);

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/user/subscription/verify',
      TOKEN,
      undefined,
      { method: 'POST', body: { signed_transaction: 'signed-storekit-transaction' } },
    );
  });
});
