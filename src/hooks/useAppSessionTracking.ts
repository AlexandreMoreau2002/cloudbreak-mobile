/**
 * useAppSessionTracking — events de session app_foregrounded/app_backgrounded.
 *
 * Monté une fois à la racine (_layout.tsx). Le foreground initial (montage)
 * compte comme le début de la première session ; chaque retour actif après
 * un passage en arrière-plan démarre une nouvelle session.
 *
 * Usage :
 *   useAppSessionTracking(); // dans RootLayout, sans destructuring
 */
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { track } from '@/services/analytics';

export function useAppSessionTracking(): void {
  const sessionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    track('app_foregrounded');
    sessionStartRef.current = Date.now();

    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'background') {
        const sessionDurationMs = Date.now() - sessionStartRef.current;
        track('app_backgrounded', { session_duration_ms: sessionDurationMs });
      } else if (status === 'active') {
        sessionStartRef.current = Date.now();
        track('app_foregrounded');
      }
    });

    return () => subscription.remove();
  }, []);
}
