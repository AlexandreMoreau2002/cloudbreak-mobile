import { useEffect } from 'react';
import { useRouter, useSegments, SplashScreen, Stack, type Href } from 'expo-router';
import {
  JosefinSans_300Light,
  JosefinSans_400Regular,
  JosefinSans_600SemiBold,
  JosefinSans_700Bold,
  useFonts,
} from '@expo-google-fonts/josefin-sans';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SelectedPeakProvider } from '@/contexts/SelectedPeakContext';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';

SplashScreen.preventAutoHideAsync();

const TABS_ROUTE = '/(tabs)' as Href;
const AUTH_LOGIN_ROUTE = '/(auth)/login' as Href;

function AuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace(AUTH_LOGIN_ROUTE);
    } else if (session && inAuthGroup) {
      router.replace(TABS_ROUTE);
    }
  }, [session, loading, segments, router]);

  return null;
}

function AppStack() {
  const { locale } = useLanguage();

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
      <LanguageProvider>
        <AuthProvider>
          <SelectedPeakProvider>
            <AuthGuard />
            <AppStack />
          </SelectedPeakProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
