/**
 * useTerrainGeofence — mémorise le sommet consulté et aligne le geofencing terrain (5.3).
 *
 * Monté une fois à la racine (_layout.tsx). Resynchronise au retour au premier plan car
 * l'utilisateur peut avoir changé la permission de localisation dans les réglages iOS.
 *
 * Usage :
 *   useTerrainGeofence(); // dans AppStack, sans destructuring
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSelectedPeak } from '@/contexts/SelectedPeakContext';
import { syncTerrainGeofences } from '@/services/terrainGeofence';
import { getTerrainPref, rememberWatchedPeak } from '@/utils/terrainWatch';

export function useTerrainGeofence(): void {
  const { selectedPeak } = useSelectedPeak();

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
