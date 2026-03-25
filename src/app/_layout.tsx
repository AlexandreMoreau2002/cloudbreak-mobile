import {
  JosefinSans_300Light,
  JosefinSans_400Regular,
  JosefinSans_600SemiBold,
  JosefinSans_700Bold,
  useFonts,
} from '@expo-google-fonts/josefin-sans';
import { useEffect } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SelectedPeakProvider } from '@/contexts/SelectedPeakContext';
import { useRouter, useSegments, SplashScreen, Stack, type Href } from 'expo-router';

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
      <AuthProvider>
        <SelectedPeakProvider>
          <AuthGuard />
          <Stack screenOptions={{ headerShown: false }} />
        </SelectedPeakProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
