/**
 * useOnboardingFlow — machine à états du parcours onboarding.
 *
 * splash → [curtain] → onb1 → onb2 → onb3 → finish()
 * Le curtain ne joue qu'une fois (splash → onb1) ; les autres
 * transitions sont des cuts secs.
 */
import { track } from '@/services/analytics';
import { DEBUG } from '@/constants/devConfig';
import { useCallback, useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';

export type OnboardingStep = 'splash' | 'onb1' | 'onb2' | 'onb3';

export function useOnboardingFlow() {
  const { completeOnboarding } = useOnboarding();
  const [step, setStep] = useState<OnboardingStep>('splash');
  const [curtainVisible, setCurtainVisible] = useState(false);

  const startCurtain = useCallback(() => setCurtainVisible(true), []);
  const onCurtainSwap = useCallback(() => setStep('onb1'), []);
  const onCurtainDone = useCallback(() => setCurtainVisible(false), []);
  const goToSummit = useCallback(() => setStep('onb2'), []);
  const goToNotifications = useCallback(() => setStep('onb3'), []);

  const finish = useCallback(async () => {
    if (DEBUG) console.debug('[useOnboardingFlow] finish');
    track('onboarding_complete');
    await completeOnboarding();
    // La redirection est assurée par l'AuthGuard (completed → replace).
  }, [completeOnboarding]);

  return {
    step,
    curtainVisible,
    startCurtain,
    onCurtainSwap,
    onCurtainDone,
    goToSummit,
    goToNotifications,
    finish,
  };
}
