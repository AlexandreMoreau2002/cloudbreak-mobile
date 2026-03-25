/** Types partagés entre les mocks et les services réels. */

export interface AsyncState<T> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: T;
  error?: string;
}

export interface FavoriteResponse {
  id: string;
  peak_id: string;
  peak: Peak;
  created_at: string;
}

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
  pressure_score?: number;
  cloud_base_m?: number | null;
  humidity?: number | null;
  humidity_pct?: number | null;
  wind_speed?: number | null;
  wind_speed_kmh?: number | null;
  inversion_delta?: number | null;
  inversion_delta_c?: number | null;
  inversion_present?: boolean | null;
  inversion_detected?: boolean | null;
  pressure_hpa?: number | null;
  cloud_cover_low_pct?: number | null;
}

export interface ScoreCloudLayerPoint {
  pressure_hpa: number;
  altitude_m: number;
  relative_humidity: number;
  temperature_c: number;
  dew_point_spread?: number;
}

export interface ScoreCloudLayerViz {
  summit_altitude: number;
  cloud_base: number;
  pressure_levels: ScoreCloudLayerPoint[];
}

export interface ScoreResponse {
  score: number;
  verdict: 'none' | 'high' | 'medium' | 'low';
  label?: string;
  cloud_base: number;
  peak_name: string;
  peak_altitude: number;
  peak_slug?: string | null;
  context_message?: string | null;
  optimal_window_start?: string | null;
  optimal_window_end?: string | null;
  sunrise?: string | null;
  stability_hours?: number | null;
  conditions: ScoreConditions;
  cloud_layer_viz?: ScoreCloudLayerViz | null;
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
