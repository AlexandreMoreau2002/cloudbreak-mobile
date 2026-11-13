import type { MockUser, MockSubscription } from '@/services/mockData/types';

export const MOCK_USER: MockUser = {
  id: 'mock-user-uuid-0001',
  email: 'alex@cloudbreak.dev',
  push_token: null,
  notif_favorites: true,
  notif_regional: false,
  notif_terrain: true,
};

export const MOCK_SUBSCRIPTION: MockSubscription = {
  user_id: 'mock-user-uuid-0001',
  plan: 'free',
  status: 'active',
  expires_at: null,
};
