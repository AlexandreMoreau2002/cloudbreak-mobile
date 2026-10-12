/**
 * useTerrainNotificationTap — tap sur « Tu es au sommet ! » (story 5.3) : demande l'ouverture
 * du sheet terrain (consommée par l'accueil), puis passe par la route de deep link
 * `/sommet/{slug}` (story 3.6) qui mémorise le slug et revient sur /(tabs), ce qui relance
 * usePendingPeakLink (sélection du sommet) même si l'app est déjà dans les onglets.
 *
 * Monté une fois à la racine (_layout.tsx).
 *
 * Usage :
 *   useTerrainNotificationTap(); // dans AppStack, sans destructuring
 */
import { useEffect, useRef } from 'react';
import { useRouter, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { isValidPeakSlug } from '@/utils/pendingPeakLink';
import { setPendingTerrainOpen } from '@/utils/terrainWatch';

export function useTerrainNotificationTap(): void {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const request = response?.notification.request;
    const data = request?.content.data;
    if (!request || data?.type !== 'terrain' || typeof data.slug !== 'string') return;
    if (!isValidPeakSlug(data.slug)) return;
    if (handledRef.current === request.identifier) return;
    handledRef.current = request.identifier;
    const slug = data.slug;

    async function open() {
      await setPendingTerrainOpen(slug);
      router.replace(`/sommet/${slug}` as Href);
    }
    void open();
  }, [response, router]);
}
