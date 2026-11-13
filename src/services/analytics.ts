/* istanbul ignore file -- DEBUG-only no-op adapter, replaced when telemetry is integrated. */
/**
 * analytics — interface d'événements produit.
 *
 * Stub : log DEBUG uniquement. PostHog sera branché derrière cette
 * interface dans une story dédiée, sans toucher les appelants.
 *
 * Usage :
 *   import { track } from '@/services/analytics';
 *   track('onboarding_complete');
 */
import { DEBUG } from '@/constants/devConfig';

export function track(event: string, props?: Record<string, unknown>): void {
  /* istanbul ignore next -- no telemetry is emitted outside DEBUG builds */
  if (DEBUG) console.debug('[analytics]', event, props ?? {});
}
