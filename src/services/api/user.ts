/**
 * api/user — appels profil utilisateur, abonnement, favoris, notifications.
 *
 * Usage :
 *   import { fetchUserSubscription, addFavorite } from '@/services/api/user';
 */
import { MOCK_API, DEBUG } from '@/constants/devConfig';
import { apiFetch, _delay } from '@/services/fetchService';
import { MOCK_SUBSCRIPTION } from '@/services/mockData/user';
import type { FavoriteResponse, MockSubscription, NotificationPreferences } from '@/services/mockData/types';

export interface UserProfile {
  supabase_user_id: string;
  auth_provider: string;
  created_at?: string;
  converted_at?: string;
  survey_completed_at?: string | null;
  survey_skipped_at?: string | null;
  acquisition_source?: string | null;
  practice?: string | null;
  newsletter_opt_in?: boolean | null;
}

export interface UserSurvey {
  acquisitionSource?: 'app_store' | 'google_search' | 'instagram' | 'tiktok' | 'word_of_mouth' | 'other';
  practice?: 'hiker' | 'trail_runner' | 'paraglider' | 'photographer' | 'mountaineer' | 'other';
  newsletterOptIn?: boolean;
  skipped?: boolean;
}

export async function provisionUser(token: string): Promise<UserProfile> {
  return apiFetch<UserProfile>('/api/v1/user/provision', token, undefined, { method: 'POST' });
}

export async function updateUserSurvey(token: string, survey: UserSurvey): Promise<UserProfile> {
  if (survey.skipped === true) {
    return apiFetch<UserProfile>('/api/v1/user/survey', token, undefined, {
      method: 'PATCH', body: { skipped: true },
    });
  }
  const body = {
    ...(survey.acquisitionSource === undefined ? {} : { acquisition_source: survey.acquisitionSource }),
    ...(survey.practice === undefined ? {} : { practice: survey.practice }),
    ...(survey.newsletterOptIn === undefined ? {} : { newsletter_opt_in: survey.newsletterOptIn }),
    ...(survey.skipped === undefined ? {} : { skipped: survey.skipped }),
  };
  return apiFetch<UserProfile>('/api/v1/user/survey', token, undefined, { method: 'PATCH', body });
}

export interface UserMe {
  id: string;
  is_anonymous: boolean;
  provisioned: boolean;
  survey_completed_at?: string | null;
  survey_skipped_at?: string | null;
  newsletter_opt_in?: boolean | null;
}

export async function fetchMe(token: string): Promise<UserMe> {
  return apiFetch<UserMe>('/api/v1/user/me', token);
}

export async function updateUserPreferences(
  token: string,
  newsletterOptIn: boolean,
): Promise<UserProfile> {
  return apiFetch<UserProfile>('/api/v1/user/preferences', token, undefined, {
    method: 'PATCH',
    body: { newsletter_opt_in: newsletterOptIn },
  });
}

export async function fetchUserSubscription(token: string): Promise<MockSubscription> {
  if (MOCK_API) {
    if (DEBUG) console.debug('[api/user] MOCK fetchUserSubscription');
    await _delay(150);
    return MOCK_SUBSCRIPTION;
  }
  return apiFetch<MockSubscription>('/api/v1/user/subscription', token);
}

export async function updateNotificationPreferences(
  token: string,
  prefs: Partial<NotificationPreferences>,
): Promise<void> {
  if (MOCK_API) {
    if (DEBUG) console.debug('[api/user] MOCK updateNotificationPreferences', prefs);
    await _delay(100);
    return;
  }
  await apiFetch<void>('/api/v1/user/notifications', token);
}

export async function updatePushToken(token: string, push_token: string): Promise<void> {
  if (MOCK_API) {
    if (DEBUG) console.debug('[api/user] MOCK updatePushToken');
    await _delay(100);
    return;
  }
  await apiFetch<void>('/api/v1/user/push-token', token);
}

export async function addFavorite(token: string, peak_id: string): Promise<FavoriteResponse> {
  if (MOCK_API) {
    if (DEBUG) console.debug('[api/user] MOCK addFavorite', { peak_id });
    await _delay(100);
    return {
      id: `fav-mock-${peak_id}`,
      peak_id,
      peak: { id: peak_id, name: 'Mock Peak', slug: 'mock-peak', lat: 0, lng: 0, altitude: 1000 },
      created_at: new Date().toISOString(),
    };
  }
  return apiFetch<FavoriteResponse>('/api/v1/user/favorites', token, undefined, {
    method: 'POST',
    body: { peak_id },
  });
}

export async function deleteAccount(token: string): Promise<void> {
  if (MOCK_API) {
    if (DEBUG) console.debug('[api/user] MOCK deleteAccount');
    await _delay(500);
    return;
  }
  await apiFetch<void>('/api/v1/user', token, undefined, { method: 'DELETE' });
}
