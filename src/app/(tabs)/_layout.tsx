import { Tabs } from 'expo-router';
import i18n from '../../utils/i18n';
import { useTheme } from '../../contexts/ThemeContext';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: i18n.t('nav.home') }} />
      <Tabs.Screen name="search" options={{ title: i18n.t('nav.search') }} />
      <Tabs.Screen name="favorites" options={{ title: i18n.t('nav.favorites') }} />
      <Tabs.Screen name="profile" options={{ title: i18n.t('nav.profile') }} />
    </Tabs>
  );
}
