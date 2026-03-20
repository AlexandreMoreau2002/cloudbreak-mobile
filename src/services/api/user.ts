/**
 * api/user — appels profil utilisateur, abonnement, favoris, notifications.
 *
 * Usage :
 *   import { fetchUserSubscription } from '@/services/api/user';
 */
import { MOCK_API, DEBUG } from '@/constants/devConfig';
import { MOCK_SUBSCRIPTION } from '@/services/mockData/user';
import { apiFetch, _delay } from '@/services/fetchService';
import type { MockSubscription, NotificationPreferences } from '@/services/mockData/types';

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

export async function addFavorite(token: string, peak_id: string): Promise<void> {
  if (MOCK_API) {
    if (DEBUG) console.debug('[api/user] MOCK addFavorite', { peak_id });
    await _delay(100);
    return;
  }
  await apiFetch<void>('/api/v1/user/favorites', token);
}
