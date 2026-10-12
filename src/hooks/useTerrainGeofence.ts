/**
 * useTerrainGeofence — mémorise le sommet consulté et aligne le geofencing terrain (5.3).
 *
 * Monté une fois à la racine (_layout.tsx). Resynchronise au retour au premier plan car
 * l'utilisateur peut avoir changé la permission de localisation dans les réglages iOS.
 *
 * Usage :
 *   useTerrainGeofence(); // dans AppStack, sans destructuring
 */
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { fetchMe } from '@/services/api/user';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedPeak } from '@/contexts/SelectedPeakContext';
import { syncTerrainGeofences } from '@/services/terrainGeofence';
import { getTerrainPref, rememberWatchedPeak, setTerrainPref } from '@/utils/terrainWatch';

export function useTerrainGeofence(): void {
  const { selectedPeak } = useSelectedPeak();
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
        // Applique la préférence serveur même si le Profil n'a jamais été ouvert ici.
        const me = await fetchMe(accessToken);
        await setTerrainPref(me.notif_terrain ?? true);
        await syncTerrainGeofences(await getTerrainPref());
      } catch {
        // réseau coupé : on garde la copie locale
      }
    }
    void applyServerPref(currentToken);
  }, [permanent, userId]);

  useEffect(() => {
    async function remember() {
      if (selectedPeak) await rememberWatchedPeak(selectedPeak);
      await syncTerrainGeofences(await getTerrainPref());
    }
    void remember();
  }, [selectedPeak]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void getTerrainPref().then(syncTerrainGeofences);
    });
    return () => subscription.remove();
  }, []);
}
