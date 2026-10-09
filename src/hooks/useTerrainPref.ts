/**
 * useTerrainPref — lit la copie locale de `notif_terrain` (défaut true), sans appel réseau.
 *
 * Usage :
 *   const terrainEnabled = useTerrainPref();
 */
import { useEffect, useState } from 'react';

import { getTerrainPref } from '@/utils/terrainWatch';

export function useTerrainPref(): boolean {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    void getTerrainPref().then(setEnabled);
  }, []);

  return enabled;
}
