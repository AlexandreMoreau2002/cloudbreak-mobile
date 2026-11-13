/**
 * useTerrainPrefSync — recopie la préférence serveur `notif_terrain` dans le stockage local
 * pour que la détection d'arrivée au premier plan (useTerrainPref) la lise sans réseau.
 *
 * Monté une fois à la racine (_layout.tsx). Aucune localisation en arrière-plan.
 *
 * Usage :
 *   useTerrainPrefSync(); // dans AppStack, sans destructuring
 */
import { useEffect, useRef } from 'react';

import { fetchMe } from '@/services/api/user';
import { useAuth } from '@/contexts/AuthContext';
import { setTerrainPref } from '@/utils/terrainWatch';

export function useTerrainPrefSync(): void {
  const { session, isAnonymous } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;
  const permanent = !!token && !isAnonymous && session?.user?.is_anonymous !== true;
  // Le jeton est lu via une ref : un refresh du JWT ne doit pas relancer fetchMe.
  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
  });

  useEffect(() => {
    const currentToken = tokenRef.current;
    if (!permanent || !currentToken) return;
    async function applyServerPref(accessToken: string) {
      try {
        const me = await fetchMe(accessToken);
        await setTerrainPref(me.notif_terrain ?? true);
      } catch {
        // réseau coupé : on garde la copie locale
      }
    }
    void applyServerPref(currentToken);
  }, [permanent, userId]);
}
