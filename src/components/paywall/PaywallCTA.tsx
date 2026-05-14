import i18n from '@/utils/i18n';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { PaywallCTAProps } from './types';

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
      </TouchableOpacity>

      <TouchableOpacity
        testID="paywall-restore-button"
        style={styles.restoreButton}
        onPress={() => {}}
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
});
