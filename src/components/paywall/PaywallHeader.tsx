import i18n from '@/utils/i18n';
import { Typography } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { StyleSheet, Text, View } from 'react-native';
import type { PaywallHeaderProps } from './types';

export function PaywallHeader({ colors }: PaywallHeaderProps) {
  return (
    <>
      <View style={[styles.trialBadge, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '40' }]}>
        <Text style={[styles.trialBadgeText, { color: colors.accent, fontFamily: Typography.fontFamily.semiBold }]}>
          {i18n.t('paywall.trialBadge')}
        </Text>
      </View>

      <Text style={[styles.title, { color: colors.textPrimary, fontFamily: Typography.fontFamily.bold }]}>
        {i18n.t('paywall.title')}
      </Text>

      <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: Typography.fontFamily.regular }]}>
        {i18n.t('paywall.subtitle')}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  trialBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  trialBadgeText: {
    fontSize: Typography.fontSize.xs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: Typography.fontSize.xl,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: Typography.fontSize.xl * Typography.lineHeight.tight,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
});
