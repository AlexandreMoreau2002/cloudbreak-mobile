import i18n from '@/utils/i18n';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

function TabIcon({ name, color }: { name: FeatherName; color: string }) {
  return <Feather name={name} size={22} color={color} />;
}

export default function TabsLayout() {
  const { colors, typography } = useTheme();

  const tabBarStyle = {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 16,
    paddingTop: 12,
  };

  const labelStyle = {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    marginTop: 4,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarStyle,
        tabBarLabelStyle: labelStyle,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: i18n.t('nav.home'),
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: i18n.t('nav.search'),
          tabBarIcon: ({ color }) => <TabIcon name="search" color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: i18n.t('nav.favorites'),
          tabBarIcon: ({ color }) => <TabIcon name="heart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: i18n.t('nav.profile'),
          tabBarIcon: ({ color }) => <TabIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
