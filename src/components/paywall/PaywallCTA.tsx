import i18n from '@/utils/i18n';
import { Colors } from '@/constants/colors';
import { track } from '@/services/analytics';
import { DEBUG } from '@/constants/devConfig';
import { Typography } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { PaywallCTAProps } from './types';

function restorePurchases() {
  track('restore_purchases_clicked');
  // Stub en attente de la story 4.3 (StoreKit 2 réel)
  if (DEBUG) console.debug('[Paywall] restorePurchases stub');
  Alert.alert(i18n.t('paywall.restoreSuccess'));
}

export function PaywallCTA({ billingPeriod, onSelectPlan, colors }: PaywallCTAProps) {
  return (
    <>
      <TouchableOpacity
        testID="paywall-cta-button"
        style={[styles.ctaButton, { backgroundColor: colors.accent }]}
        onPress={() => onSelectPlan(billingPeriod)}
        activeOpacity={0.85}
      >
        <Text style={[styles.ctaButtonText, { color: Colors.light.surface, fontFamily: Typography.fontFamily.bold }]}>
          {i18n.t('paywall.ctaStart')}
        </Text>
        <Text
          testID="paywall-cta-trial-end-note"
          style={[styles.trialEndNote, { color: Colors.light.surface, fontFamily: Typography.fontFamily.regular }]}
        >
          {i18n.t('paywall.ctaTrialEndNote', {
            price: i18n.t(billingPeriod === 'monthly' ? 'paywall.priceMonthly' : 'paywall.priceAnnual'),
          })}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="paywall-restore-button"
        style={styles.restoreButton}
        onPress={restorePurchases}
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
