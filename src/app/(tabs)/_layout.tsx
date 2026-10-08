import i18n from '@/utils/i18n';
import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { PaywallScreen } from '@/components/paywall';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePaywall, PaywallProvider } from '@/contexts/PaywallContext';
import { useSubscriptionPurchase } from '@/hooks/useSubscriptionPurchase';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

function TabIcon({ name, color }: { name: FeatherName; color: ColorValue }) {
  return <Feather name={name} size={22} color={color} />;
}

function GlobalPaywall() {
  const { paywallVisible, hidePaywall } = usePaywall();
  const subscriptionPurchase = useSubscriptionPurchase();

  useEffect(() => {
    if (paywallVisible && subscriptionPurchase.isPremium) hidePaywall();
  }, [hidePaywall, paywallVisible, subscriptionPurchase.isPremium]);

  return (
    <PaywallScreen
      visible={paywallVisible}
      onDismiss={hidePaywall}
      products={subscriptionPurchase.products}
      isLoading={subscriptionPurchase.isLoading}
      error={subscriptionPurchase.error}
      onSelectPlan={subscriptionPurchase.selectPlan}
      onRestore={subscriptionPurchase.restore}
      onRetryProducts={subscriptionPurchase.refresh}
    />
  );
}

export default function TabsLayout() {
  const { locale } = useLanguage();
  const { colors, typography } = useTheme();

  const tabBarStyle = {
    backgroundColor: colors.background,
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    zIndex: 10,
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
    <PaywallProvider>
    <Tabs
      key={locale}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.textPrimary,
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
    <GlobalPaywall />
    </PaywallProvider>
  );
}
