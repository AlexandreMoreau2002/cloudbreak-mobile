/**
 * usePendingTerrainOpen — ouvre le sheet de validation terrain après un tap sur la
 * notification (5.3), une fois la prévision du sommet affichée.
 *
 * Usage :
 *   usePendingTerrainOpen({ slug: selectedPeak?.slug ?? null, ready: !!prediction, onOpen });
 */
import { useEffect, useRef } from 'react';

import { consumePendingTerrainOpen } from '@/utils/terrainWatch';

interface Args {
  slug: string | null;
  ready: boolean;
  onOpen: () => void;
}

export function usePendingTerrainOpen({ slug, ready, onOpen }: Args): void {
  const onOpenRef = useRef(onOpen);

  useEffect(() => {
    onOpenRef.current = onOpen;
  });

  useEffect(() => {
    if (!ready || !slug) return;
    void consumePendingTerrainOpen(slug).then((pending) => {
      if (pending) onOpenRef.current();
    });
  }, [ready, slug]);
}
