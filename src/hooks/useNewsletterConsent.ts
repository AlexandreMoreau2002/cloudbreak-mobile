/**
 * useNewsletterConsent — lit et bascule le consentement newsletter (RGPD).
 *
 * Le consentement est fixé une première fois par le mini-sondage post-création,
 * mais reste modifiable dans les deux sens à tout moment via
 * `PATCH /api/v1/user/preferences` (RGPD art. 7-3).
 *
 * Usage :
 *   const { state, optedIn, toggle } = useNewsletterConsent();
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DEBUG, MOCK_API } from '@/constants/devConfig';
import type { AsyncState } from '@/services/mockData/types';
import { fetchMe, updateUserPreferences } from '@/services/api/user';

export function useNewsletterConsent() {
  const { session, isAnonymous } = useAuth();
  const token = session?.access_token ?? null;
  const anonymous = isAnonymous || session?.user?.is_anonymous === true;
  const [state, setState] = useState<AsyncState<boolean>>({ status: 'idle' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (anonymous || !token) {
      setState({ status: 'idle' });
      return;
    }
    if (MOCK_API) {
      setState({ status: 'success', data: false });
      return;
    }
    if (DEBUG) console.debug('[useNewsletterConsent] load');
    setState({ status: 'loading' });
    try {
      const me = await fetchMe(token);
      setState({ status: 'success', data: me.newsletter_opt_in === true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      if (DEBUG) console.debug('[useNewsletterConsent] load error', { message });
      setState({ status: 'error', error: message });
    }
  }, [anonymous, token]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(async () => {
    if (state.status !== 'success' || saving || !token) return;
    const next = !state.data;
    if (DEBUG) console.debug('[useNewsletterConsent] toggle', { next });
    setSaving(true);
    setState({ status: 'success', data: next });
    if (MOCK_API) {
      setSaving(false);
      return;
    }
    try {
      await updateUserPreferences(token, next);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      if (DEBUG) console.debug('[useNewsletterConsent] toggle error', { message });
      setState({ status: 'success', data: !next });
    } finally {
      setSaving(false);
    }
  }, [state, saving, token]);

  const optedIn = state.status === 'success' ? state.data : false;

  return { state, optedIn, saving, toggle, refresh: load };
}
