/**
 * Route de deep link `/sommet/{slug}` (Universal Links iOS).
 * Mémorise le slug, puis laisse usePendingPeakLink sélectionner le sommet.
 */
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { setPendingPeakSlug } from '@/utils/pendingPeakLink';

const TABS_ROUTE = '/(tabs)' as Href;

export default function SommetDeepLink() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug?: string }>();

  useEffect(() => {
    async function storeAndLeave() {
      if (typeof slug === 'string') await setPendingPeakSlug(slug);
      router.replace(TABS_ROUTE);
    }
    void storeAndLeave();
  }, [slug, router]);

  return null;
}
