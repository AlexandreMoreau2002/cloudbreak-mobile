/**
 * usePendingPeakLink — consomme le slug d'un deep link `/sommet/{slug}` mémorisé,
 * dès que l'utilisateur a terminé l'onboarding et possède une session.
 */
import { Alert } from 'react-native';
import { useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import i18n from '@/utils/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { fetchPeakBySlug } from '@/services/api/peaks';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useSelectedPeak } from '@/contexts/SelectedPeakContext';
import { clearPendingPeakSlug, getPendingPeakSlug } from '@/utils/pendingPeakLink';

// apiFetch lève une Error avec `httpStatus` (404 réel) ; le mock lève 'Peak not found'.
function isNotFound(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (error as Error & { httpStatus?: number }).httpStatus === 404 || error.message === 'Peak not found';
}

export function usePendingPeakLink(): void {
  const segments = useSegments();
  const { session } = useAuth();
  const { completed } = useOnboarding();
  const { setSelectedPeak } = useSelectedPeak();
  const running = useRef(false);
  const token = session?.access_token ?? null;
  const area: string | undefined = segments[0];

  useEffect(() => {
    if (!token || !completed || area === 'onboarding' || area === 'sommet') return;
    if (running.current) return;
    running.current = true;

    async function consume() {
      try {
        const slug = await getPendingPeakSlug();
        if (!slug) return;
        await clearPendingPeakSlug();
        const peak = await fetchPeakBySlug(token, slug);
        setSelectedPeak(peak);
      } catch (error) {
        if (isNotFound(error)) {
          Alert.alert(i18n.t('deepLink.notFoundTitle'), i18n.t('deepLink.notFoundMessage'));
        } else {
          Alert.alert(i18n.t('deepLink.errorTitle'), i18n.t('common.networkHint'));
        }
      } finally {
        running.current = false;
      }
    }

    void consume();
  }, [token, completed, area, setSelectedPeak]);
}
