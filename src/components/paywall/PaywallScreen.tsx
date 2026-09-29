/**
 * PaywallScreen — modal plein écran affiché quand le quota freemium est atteint.
 *
 * Props :
 *   visible      boolean  — contrôle l'affichage du modal
 *   onDismiss    function — appelé quand l'utilisateur ferme le paywall
 *   onSelectPlan function — appelé avec 'monthly' ou 'annual' lors de la sélection
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import i18n from '@/utils/i18n';
import { Colors } from '@/constants/colors';
import { track } from '@/services/analytics';
import { DEBUG } from '@/constants/devConfig';
import { Radius, Spacing } from '@/constants/spacing';
import { ErrorState } from '@/components/error-state';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PaywallCTA } from './PaywallCTA';
import { PaywallHeader } from './PaywallHeader';
import { PaywallFooter } from './PaywallFooter';
import { PaywallBillingToggle } from './PaywallBillingToggle';
import type { BillingPeriod, PaywallScreenProps } from './types';

export function PaywallScreen({
  visible,
  onDismiss,
  products,
  isLoading,
  error,
  onSelectPlan,
  onRestore,
  onRetryProducts,
}: PaywallScreenProps) {
  useLanguage();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual');

  const overlayBg = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)';
  const sheetBg = isDark ? Colors.dark.surface : Colors.light.surface;
  const dividerColor = isDark ? Colors.dark.border : Colors.light.border;

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(600);
    }
  }, [visible, overlayOpacity, sheetTranslateY]);

  function handleSelectPlan(plan: BillingPeriod) {
    if (DEBUG) console.debug('[PaywallScreen] plan sélectionné', { plan });
    track('plan_selected', { period: plan });
    return onSelectPlan(plan);
  }

  function handleChangePeriod(period: BillingPeriod) {
    track('billing_period_selected', { period });
    setBillingPeriod(period);
  }

  const selectedProduct = products.find((product) => product.billingPeriod === billingPeriod) ?? null;
  const hasTrial = selectedProduct?.hasFreeTrial ?? false;
  const showStoreError = !isLoading && (!selectedProduct || error === 'store_unavailable');

  return (
    <Modal
      testID="paywall-modal"
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Fond assombri — fade indépendant */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: overlayBg, opacity: overlayOpacity }]}
          pointerEvents="none"
        />
        {/* Zone de dismiss (hors sheet) */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} testID="paywall-overlay" />
        {/* Sheet — slide depuis le bas */}
        <Animated.View
          style={[styles.sheet, { backgroundColor: sheetBg, transform: [{ translateY: sheetTranslateY }] }]}
          testID="paywall-sheet"
        >
          <View style={[styles.handle, { backgroundColor: dividerColor }]} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            <PaywallHeader
              colors={{
                accent: colors.accent,
                textPrimary: colors.textPrimary,
                textSecondary: colors.textSecondary,
              }}
              showTrial={hasTrial}
            />

            <PaywallBillingToggle
              billingPeriod={billingPeriod}
              onChangePeriod={handleChangePeriod}
              colors={{
                accent: colors.accent,
                border: colors.border,
                textPrimary: colors.textPrimary,
              }}
              products={products}
            />

            {showStoreError ? (
              <ErrorState
                title={i18n.t('paywall.storeUnavailableTitle')}
                message={i18n.t('paywall.storeUnavailableMessage')}
                action={{ label: i18n.t('common.retry'), onPress: () => { void onRetryProducts(); } }}
                actionTestID="paywall-store-retry"
              />
            ) : null}

            <PaywallCTA
              billingPeriod={billingPeriod}
              product={selectedProduct}
              isLoading={isLoading}
              onSelectPlan={handleSelectPlan}
              onRestore={onRestore}
              colors={{
                accent: colors.accent,
                textSecondary: colors.textSecondary,
              }}
            />

            <PaywallFooter
              onDismiss={onDismiss}
              colors={{ textSecondary: colors.textSecondary, border: colors.border }}
            />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '92%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    alignItems: 'center',
  },
});
