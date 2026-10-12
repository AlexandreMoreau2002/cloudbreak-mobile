/**
 * useNotificationTap — tap sur une notification locale ou push :
 * - `terrain` (story 5.3, « Tu es au sommet ! ») : demande l'ouverture du sheet terrain
 *   (consommée par l'accueil), puis navigue vers le sommet ;
 * - `favorite_alert` (story 5.2, alerte favoris) : navigue vers le sommet, sans sheet.
 * La navigation passe par la route de deep link `/sommet/{slug}` (story 3.6), qui mémorise
 * le slug et revient sur /(tabs), ce qui relance usePendingPeakLink (sélection du sommet)
 * même si l'app est déjà dans les onglets.
 *
 * Monté une fois à la racine (_layout.tsx).
 *
 * Usage :
 *   useNotificationTap(); // dans AppStack, sans destructuring
 */
import { useEffect, useRef } from 'react';
import { useRouter, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { isValidPeakSlug } from '@/utils/pendingPeakLink';
import { setPendingTerrainOpen } from '@/utils/terrainWatch';

export function useNotificationTap(): void {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const request = response?.notification.request;
    const data = request?.content.data;
    if (!request || (data?.type !== 'terrain' && data?.type !== 'favorite_alert')) return;
    if (typeof data.slug !== 'string' || !isValidPeakSlug(data.slug)) return;
    if (handledRef.current === request.identifier) return;
    handledRef.current = request.identifier;
    const slug = data.slug;
    const isTerrain = data.type === 'terrain';

    async function open() {
      if (isTerrain) await setPendingTerrainOpen(slug);
      router.replace(`/sommet/${slug}` as Href);
    }
    void open();
  }, [response, router]);
}
