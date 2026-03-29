import { MOCK_SUBSCRIPTION, MOCK_USER } from '@/services/mockData/user';

describe('mockData/user', () => {
  it('expose un utilisateur mock cohérent', () => {
    expect(MOCK_USER).toMatchObject({
      id: 'mock-user-uuid-0001',
      email: 'alex@cloudbreak.dev',
      notif_favorites: true,
    });
  });

  it('expose un abonnement mock cohérent', () => {
    expect(MOCK_SUBSCRIPTION).toMatchObject({
      user_id: 'mock-user-uuid-0001',
      plan: 'free',
      status: 'active',
    });
  });
});
