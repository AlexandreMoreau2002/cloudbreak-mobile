import type {
  MockSubscription,
  MockUser,
  Peak,
  ScoreResponse,
} from '@/services/mockData/types';

describe('mockData/types', () => {
  it('permet de typer un Peak complet', () => {
    const peak: Peak = {
      id: 'peak-1',
      name: 'Mont Blanc',
      slug: 'mont-blanc',
      lat: 45,
      lng: 6,
      altitude: 4807,
      region: 'Massif du Mont-Blanc',
    };
    expect(peak.region).toBe('Massif du Mont-Blanc');
  });

  it('permet de typer un ScoreResponse minimal valide', () => {
    const score: ScoreResponse = {
      score: 0,
      verdict: 'none',
      cloud_base: 0,
      peak_name: '',
      peak_altitude: 0,
      conditions: {
        cloud_base_score: 0,
        humidity_score: 0,
        wind_score: 0,
        inversion_score: 0,
      },
    };
    expect(score.verdict).toBe('none');
  });

  it('permet de typer les mocks user/subscription', () => {
    const user: MockUser = {
      id: 'u1',
      email: 'a@b.c',
      push_token: null,
      notif_favorites: true,
      notif_regional: false,
      notif_terrain: true,
    };
    const sub: MockSubscription = {
      user_id: 'u1',
      plan: 'free',
      status: 'active',
      expires_at: null,
    };
    expect(user.id).toBe(sub.user_id);
  });
});
