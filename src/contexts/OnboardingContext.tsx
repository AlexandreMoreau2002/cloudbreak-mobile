/**
 * OnboardingContext — flag onboarding_completed (AsyncStorage).
 *
 * Usage :
 *   const { completed, hydrated, completeOnboarding } = useOnboarding();
 */
import { DEBUG } from '@/constants/devConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useEffect, useContext, useState, useCallback, type ReactNode } from 'react';

const STORAGE_KEY = 'onboarding_completed';

interface OnboardingContextValue {
  completed: boolean;
  hydrated: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [completed, setCompleted] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && raw === 'true') setCompleted(true);
        /* istanbul ignore next -- diagnostic disponible uniquement dans les builds DEBUG */
        if (DEBUG) console.debug('[OnboardingContext] hydrated', { completed: raw === 'true' });
      } catch {
        // Storage best-effort — défaut : onboarding à montrer.
      } finally {
        if (mounted) setHydrated(true);
      }
    }
    void hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  const completeOnboarding = useCallback(async () => {
    setCompleted(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Best-effort : au pire l'onboarding se remontre au prochain launch.
    }
  }, []);

  const resetOnboarding = useCallback(async () => {
    // Outil dev/QA : efface le flag pour rejouer le parcours complet.
    setCompleted(false);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Best-effort — l'état mémoire suffit pour rejouer immédiatement.
    }
  }, []);

  return (
    <OnboardingContext.Provider value={{ completed, hydrated, completeOnboarding, resetOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
