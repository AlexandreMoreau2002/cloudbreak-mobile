/**
 * useTerrainPref — lit la copie locale de `notif_terrain` (défaut true), sans appel réseau.
 *
 * Relue à chaque focus de l'écran (les onglets restent montés) et au retour au premier plan,
 * pour refléter un changement fait dans Profil → Notifications.
 *
 * Usage :
 *   const terrainEnabled = useTerrainPref();
 */
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';

import { getTerrainPref } from '@/utils/terrainWatch';

export function useTerrainPref(): boolean {
  const [enabled, setEnabled] = useState(true);

  const reload = useCallback(() => {
    void getTerrainPref().then(setEnabled);
  }, []);

  useFocusEffect(reload);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') reload();
    });
    return () => subscription.remove();
  }, [reload]);

  return enabled;
}
