import { MOCK_API } from '@/constants/devConfig';
import { apiFetch } from '@/services/fetchService';

export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'expired' | 'revoked';

export interface SubscriptionResponse {
  plan: 'free' | 'premium';
  status: SubscriptionStatus;
  expires_at: string | null;
}

const MOCK_FREE_SUBSCRIPTION: SubscriptionResponse = {
  plan: 'free',
  status: 'none',
  expires_at: null,
};

export async function fetchSubscription(token: string): Promise<SubscriptionResponse> {
  if (MOCK_API) return MOCK_FREE_SUBSCRIPTION;
  return apiFetch<SubscriptionResponse>('/api/v1/user/subscription', token);
}

export async function verifySubscription(
  token: string,
  signedTransaction: string,
): Promise<SubscriptionResponse> {
  return apiFetch<SubscriptionResponse>('/api/v1/user/subscription/verify', token, undefined, {
    method: 'POST',
    body: { signed_transaction: signedTransaction },
  });
}
