/**
 * useTerrainNotificationTap — tap sur « Tu es au sommet ! » (story 5.3) : sélectionne le
 * sommet de la notification, demande l'ouverture du sheet terrain (consommée par l'accueil)
 * puis revient sur l'accueil.
 *
 * Monté une fois à la racine (_layout.tsx), sous AuthProvider et SelectedPeakProvider.
 *
 * Usage :
 *   useTerrainNotificationTap(); // dans AppStack, sans destructuring
 */
import { useEffect, useRef } from 'react';
import { useRouter, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { useAuth } from '@/contexts/AuthContext';
import { fetchPeakBySlug } from '@/services/api/peaks';
import { useSelectedPeak } from '@/contexts/SelectedPeakContext';
import { consumePendingTerrainOpen, setPendingTerrainOpen } from '@/utils/terrainWatch';

const TABS_ROUTE = '/(tabs)' as Href;

export function useTerrainNotificationTap(): void {
  const router = useRouter();
  const { session } = useAuth();
  const { setSelectedPeak } = useSelectedPeak();
  const response = Notifications.useLastNotificationResponse();
  const handledRef = useRef<string | null>(null);
  const token = session?.access_token ?? null;

  useEffect(() => {
    const request = response?.notification.request;
    const data = request?.content.data;
    if (!token || !request || data?.type !== 'terrain' || typeof data.slug !== 'string') return;
    if (handledRef.current === request.identifier) return;
    handledRef.current = request.identifier;
    const slug = data.slug;

    async function open() {
      await setPendingTerrainOpen(slug);
      try {
        setSelectedPeak(await fetchPeakBySlug(token, slug));
      } catch {
        // sommet introuvable / réseau coupé : pas de sheet orphelin, mais on ouvre l'accueil
        await consumePendingTerrainOpen(slug);
      }
      router.replace(TABS_ROUTE);
    }
    void open();
  }, [response, token, router, setSelectedPeak]);
}
