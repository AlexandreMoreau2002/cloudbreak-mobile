import { DEBUG } from '@/constants/devConfig';

export type DataRefreshSource =
  | 'week-data'
  | 'favorites'
  | 'display-name'
  | 'newsletter'
  | 'notifications'
  | 'subscription';

export type DataRefreshReason = 'mount-or-session' | 'manual' | 'mutation' | 'foreground';

export function debugDataRefresh(
  source: DataRefreshSource,
  reason: DataRefreshReason,
  context?: Record<string, number | boolean>,
): void {
  if (DEBUG) console.debug('[data-refresh]', { source, reason, context });
}
