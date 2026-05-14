import i18n from '@/utils/i18n';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { PaywallFooterProps } from './types';

export function PaywallFooter({ onDismiss, colors }: PaywallFooterProps) {
  return (
    <TouchableOpacity
      testID="paywall-dismiss-button"
      style={styles.dismissButton}
      onPress={onDismiss}
      activeOpacity={0.7}
    >
      <Text style={[styles.dismissText, { color: colors.textSecondary, fontFamily: Typography.fontFamily.light }]}>
        {i18n.t('paywall.dismiss')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  dismissButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  dismissText: {
    fontSize: Typography.fontSize.sm,
  },
});
