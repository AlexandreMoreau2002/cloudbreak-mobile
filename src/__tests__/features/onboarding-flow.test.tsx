/**
 * Feature test — parcours onboarding complet (story 7.1).
 *
 * Approche : composants et contexte RÉELS (OnboardingProvider, ThemeProvider,
 * useOnboardingFlow) + fake timers pour piloter SplashView (1800ms) et
 * CloudCurtain (swap 880ms / done 2500ms). `SummitSlide` est mocké par un
 * bouton léger exposant directement `onContinue` : le vrai composant dépend
 * de `useOnboardingPeaks` (appels réseau réels via `fetchPeakBySlug` /
 * `searchPeaks`, non pertinents ici et non mockables proprement sans
 * dupliquer les tests déjà couverts dans SummitSlide.test.tsx) — piloter le
 * vrai composant introduirait de la latence/flakiness réseau sans valeur
 * ajoutée pour ce test de machine à états. `NotificationsSlide` reste réel :
 * `expo-notifications` est déjà mocké globalement (jest.setup.ts) pour
 * résoudre `granted` immédiatement, donc aucun risque réseau/latence.
 */
import { track } from '@/services/analytics';
import OnboardingScreen from '@/app/onboarding';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, fireEvent, configure } from '@testing-library/react-native';

configure({ defaultIncludeHiddenElements: true });

const asyncStorageStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(asyncStorageStore[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    asyncStorageStore[key] = value;
    return Promise.resolve();
  }),
}));

jest.mock('@/services/analytics', () => ({
  track: jest.fn(),
}));

jest.mock('@/components/onboarding/summit-slide', () => {
  const { Pressable, Text } = require('react-native');
  return {
    SummitSlide: ({ onContinue }: { onContinue: () => void }) => (
      <Pressable testID="summit-continue-fake" onPress={onContinue}>
        <Text>summit-slide-fake</Text>
      </Pressable>
    ),
  };
});

const mockTrack = track as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

function renderScreen() {
  return render(
    <ThemeProvider>
      <OnboardingProvider>
        <OnboardingScreen />
      </OnboardingProvider>
    </ThemeProvider>,
  );
}

describe('feature — onboarding flow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    Object.keys(asyncStorageStore).forEach((key) => delete asyncStorageStore[key]);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('walks splash → curtain → onb1 → onb2 → onb3 → finish, persisting completion', async () => {
    const { getByTestId, queryByTestId } = renderScreen();

    // 1. Splash visible, curtain absent.
    expect(getByTestId('splash-mascot')).toBeTruthy();
    expect(queryByTestId('cloud-curtain')).toBeNull();

    // 2. Splash finishes at 1800ms → curtain mounts.
    await act(async () => {
      jest.advanceTimersByTime(1800);
    });
    expect(getByTestId('cloud-curtain')).toBeTruthy();

    // 3. Curtain swaps the route at 880ms → WelcomeSlide (onb1) underneath.
    await act(async () => {
      jest.advanceTimersByTime(880);
    });
    expect(getByTestId('welcome-continue')).toBeTruthy();

    // Let the curtain finish its own timeline (2500ms total) to unmount cleanly.
    await act(async () => {
      jest.advanceTimersByTime(2500 - 880);
    });

    // 4. Continue from onb1 → onb2 (SummitSlide, mocked).
    fireEvent.press(getByTestId('welcome-continue'));
    expect(getByTestId('summit-continue-fake')).toBeTruthy();

    // 5. Continue from onb2 → onb3 (NotificationsSlide, real).
    fireEvent.press(getByTestId('summit-continue-fake'));
    expect(getByTestId('notif-skip')).toBeTruthy();

    // 6. "Plus tard" (skip) finishes the onboarding.
    await act(async () => {
      fireEvent.press(getByTestId('notif-skip'));
    });

    expect(mockTrack).toHaveBeenCalledWith('onboarding_complete');
    expect(mockSetItem).toHaveBeenCalledWith('onboarding_completed', 'true');
  });
});
