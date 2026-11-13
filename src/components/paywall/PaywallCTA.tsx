import i18n from '@/utils/i18n';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { track } from '@/services/analytics';
import type { PaywallCTAProps } from './types';

export function PaywallCTA({ billingPeriod, product, isLoading, onSelectPlan, onRestore, colors }: PaywallCTAProps) {
  const canPurchase = product !== null && !isLoading;
  const disclosure = product?.hasFreeTrial
    ? i18n.t('paywall.ctaTrialDisclosure', { price: product.displayPrice, period: i18n.t(`paywall.period${billingPeriod === 'monthly' ? 'Month' : 'Year'}`) })
    : product ? i18n.t('paywall.ctaRenewalDisclosure', { price: product.displayPrice, period: i18n.t(`paywall.period${billingPeriod === 'monthly' ? 'Month' : 'Year'}`) }) : '';

  async function restorePurchases(): Promise<void> {
    track('restore_purchases_clicked');
    await onRestore();
  }

  return (
    <>
      <TouchableOpacity
        testID="paywall-cta-button"
        style={[styles.ctaButton, { backgroundColor: colors.accent }]}
        onPress={() => { void onSelectPlan(billingPeriod); }}
        disabled={!canPurchase}
        accessibilityState={{ disabled: !canPurchase, busy: isLoading }}
        activeOpacity={0.85}
      >
        <Text style={[styles.ctaButtonText, { color: Colors.light.surface, fontFamily: Typography.fontFamily.bold }]}>
          {isLoading ? i18n.t('common.loading') : i18n.t('paywall.ctaStart')}
        </Text>
        <Text
          testID="paywall-cta-trial-end-note"
          style={[styles.trialEndNote, { color: Colors.light.surface, fontFamily: Typography.fontFamily.regular }]}
        >
          {disclosure}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="paywall-restore-button"
        style={styles.restoreButton}
        onPress={() => { void restorePurchases(); }}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Text style={[styles.restoreText, { color: colors.textSecondary, fontFamily: Typography.fontFamily.regular }]}>
          {i18n.t('paywall.ctaRestore')}
        </Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  ctaButton: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  ctaButtonText: {
    fontSize: Typography.fontSize.sm,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  restoreButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  restoreText: {
    fontSize: Typography.fontSize.sm,
  },
  trialEndNote: {
    fontSize: Typography.fontSize.xs,
    opacity: 0.85,
    marginTop: Spacing.xs,
  },
});
