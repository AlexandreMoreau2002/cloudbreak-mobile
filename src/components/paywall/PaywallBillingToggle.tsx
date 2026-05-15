import i18n from '@/utils/i18n';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { PaywallBillingToggleProps } from './types';

export function PaywallBillingToggle({ billingPeriod, onChangePeriod, colors }: PaywallBillingToggleProps) {
  return (
    <View style={[styles.billingToggle, { borderColor: colors.border }]}>
      <TouchableOpacity
        testID="paywall-billing-monthly"
        style={[styles.billingOption, { backgroundColor: billingPeriod === 'monthly' ? colors.accent : 'transparent', borderColor: colors.border }]}
        onPress={() => onChangePeriod('monthly')}
        activeOpacity={0.8}
      >
        <Text style={[styles.billingLabel, { color: billingPeriod === 'monthly' ? Colors.light.surface : colors.textPrimary, fontFamily: Typography.fontFamily.semiBold }]}>
          {i18n.t('paywall.billingMonthly')}
        </Text>
        <Text style={[styles.billingPrice, { color: billingPeriod === 'monthly' ? Colors.light.surface : colors.accent, fontFamily: Typography.fontFamily.bold }]}>
          {i18n.t('paywall.priceMonthly')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="paywall-billing-annual"
        style={[styles.billingOption, { backgroundColor: billingPeriod === 'annual' ? colors.accent : 'transparent', borderColor: colors.border }]}
        onPress={() => onChangePeriod('annual')}
        activeOpacity={0.8}
      >
        <Text style={[styles.billingLabel, { color: billingPeriod === 'annual' ? Colors.light.surface : colors.textPrimary, fontFamily: Typography.fontFamily.semiBold }]}>
          {i18n.t('paywall.billingAnnual')}
        </Text>
        <Text style={[styles.billingPrice, { color: billingPeriod === 'annual' ? Colors.light.surface : colors.accent, fontFamily: Typography.fontFamily.bold }]}>
          {i18n.t('paywall.priceAnnual')}
        </Text>
        <View style={[styles.savingsBadge, { backgroundColor: billingPeriod === 'annual' ? Colors.light.surface + '30' : colors.accent + '20' }]}>
          <Text style={[styles.savingsText, { color: billingPeriod === 'annual' ? Colors.light.surface : colors.accent, fontFamily: Typography.fontFamily.semiBold }]}>
            {i18n.t('paywall.billingSavings')}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  billingToggle: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  billingOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: 2,
  },
  billingLabel: {
    fontSize: Typography.fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  billingPrice: {
    fontSize: Typography.fontSize.md,
  },
  savingsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginTop: 2,
  },
  savingsText: {
    fontSize: Typography.fontSize.xs,
  },
});
