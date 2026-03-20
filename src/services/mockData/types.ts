/** Types partagés entre les mocks et les services réels. */

export interface Peak {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  altitude: number;
}

export interface ScoreConditions {
  cloud_base_score: number;
  humidity_score: number;
  wind_score: number;
  inversion_score: number;
}

export interface ScoreResponse {
  score: number;
  verdict: 'high' | 'medium' | 'low';
  cloud_base: number;
  peak_name: string;
  peak_altitude: number;
  conditions: ScoreConditions;
}

export interface MockUser {
  id: string;
  email: string;
  push_token: string | null;
  notif_favorites: boolean;
  notif_regional: boolean;
  notif_terrain: boolean;
}

export interface MockSubscription {
  user_id: string;
  plan: 'free' | 'premium';
  status: 'active' | 'expired' | 'cancelled';
  expires_at: string | null;
}

export interface NotificationPreferences {
  notif_favorites: boolean;
  notif_regional: boolean;
  notif_terrain: boolean;
}
