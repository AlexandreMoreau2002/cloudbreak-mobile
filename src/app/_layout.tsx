import { Alert } from 'react-native';
import {
  JosefinSans_300Light,
  JosefinSans_400Regular,
  JosefinSans_600SemiBold,
  JosefinSans_700Bold,
  useFonts,
} from '@expo-google-fonts/josefin-sans';
import { useEffect, useRef } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SelectedPeakProvider } from '@/contexts/SelectedPeakContext';
import { useAppSessionTracking } from '@/hooks/useAppSessionTracking';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';
import { AccountGateProvider, useAccountGate } from '@/contexts/AccountGateContext';
import i18n from '@/utils/i18n';
import { useRouter, useSegments, SplashScreen, Stack, type Href } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const TABS_ROUTE = '/(tabs)' as Href;
const ONBOARDING_ROUTE = '/onboarding' as Href;

function AuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { session, loading, ensureAnonymousSession } = useAuth();
  const { maybePromptFirstRun } = useAccountGate();
  useLanguage();
  const { completed, hydrated } = useOnboarding();
  const anonymousAttempted = useRef(false);

  useEffect(() => {
    if (loading || !hydrated) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!completed) {
      if (!inOnboarding) router.replace(ONBOARDING_ROUTE);
      return;
    }
    if (session?.user?.is_anonymous) void maybePromptFirstRun();
    if (inOnboarding) {
      if (session) router.replace(TABS_ROUTE);
      else if (!anonymousAttempted.current) {
        anonymousAttempted.current = true;
        void ensureAnonymousSession().then((error) => {
          if (error) Alert.alert(i18n.t('common.serviceUnavailable'), i18n.t('common.networkHint'));
          else router.replace(TABS_ROUTE);
        });
      }
    } else if (!session && !anonymousAttempted.current) {
      anonymousAttempted.current = true;
      void ensureAnonymousSession().then((error) => {
        if (error) Alert.alert(i18n.t('common.serviceUnavailable'), i18n.t('common.networkHint'));
        else router.replace(TABS_ROUTE);
      });
    }
  }, [session, loading, completed, hydrated, segments, router, ensureAnonymousSession, maybePromptFirstRun]);

  return null;
}

function AppStack() {
  const { locale } = useLanguage();
  useAppSessionTracking();

  return <Stack key={locale} screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    JosefinSans_300Light,
    JosefinSans_400Regular,
    JosefinSans_600SemiBold,
    JosefinSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <OnboardingProvider>
        <LanguageProvider>
          <AuthProvider>
            <SelectedPeakProvider>
              <AccountGateProvider>
                <AuthGuard />
                <AppStack />
              </AccountGateProvider>
            </SelectedPeakProvider>
          </AuthProvider>
        </LanguageProvider>
      </OnboardingProvider>
    </ThemeProvider>
  );
}
