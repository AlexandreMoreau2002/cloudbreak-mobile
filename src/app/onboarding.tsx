import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { SplashView } from '@/components/onboarding/splash-view';
import { SummitSlide } from '@/components/onboarding/summit-slide';
import { CloudCurtain } from '@/components/onboarding/cloud-curtain';
import { WelcomeSlide } from '@/components/onboarding/welcome-slide';
import { useOnboardingFlow } from '@/hooks/onboarding/useOnboardingFlow';
import { NotificationsSlide } from '@/components/onboarding/notifications-slide';
import { LocationSlide } from '@/components/onboarding/location-slide/LocationSlide';

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const {
    step,
    curtainVisible,
    startCurtain,
    onCurtainSwap,
    onCurtainDone,
    goToSummit,
    goToNotifications,
    goToLocation,
    finish,
  } = useOnboardingFlow();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {step === 'splash' && <SplashView onDone={startCurtain} />}
      {step === 'onb1' && <WelcomeSlide onContinue={goToSummit} />}
      {step === 'onb2' && <SummitSlide onContinue={goToNotifications} />}
      {step === 'onb3' && <NotificationsSlide onGoNext={goToLocation} />}
      {step === 'onb4' && <LocationSlide onFinish={() => void finish()} />}
      {curtainVisible && <CloudCurtain onSwap={onCurtainSwap} onDone={onCurtainDone} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
