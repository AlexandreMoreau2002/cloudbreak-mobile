import i18n from '@/utils/i18n';
import { Spacing } from '@/constants/spacing';
import { LEGAL_URLS } from '@/constants/legalUrls';
import { Typography } from '@/constants/typography';
import { useLegalLinks } from '@/hooks/useLegalLinks';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { PaywallFooterProps } from './types';

export function PaywallFooter({ onDismiss, colors }: PaywallFooterProps) {
  const { openLegalLink } = useLegalLinks();

  return (
    <>
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

      <View style={[styles.legalFooter, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          testID="paywall-privacy-link"
          onPress={() => openLegalLink(LEGAL_URLS.privacy)}
          activeOpacity={0.7}
          style={styles.legalLinkTouchable}
        >
          <Text style={[styles.legalLinkText, { color: colors.textSecondary }]}>
            {i18n.t('legal.privacy')}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.legalSeparator, { color: colors.textSecondary }]}> · </Text>
        <TouchableOpacity
          testID="paywall-cgu-link"
          onPress={() => openLegalLink(LEGAL_URLS.cgu)}
          activeOpacity={0.7}
          style={styles.legalLinkTouchable}
        >
          <Text style={[styles.legalLinkText, { color: colors.textSecondary }]}>
            {i18n.t('legal.cgu')}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.legalSeparator, { color: colors.textSecondary }]}> · </Text>
        <Text style={[styles.legalLinkText, { color: colors.textSecondary }]}>
          {i18n.t('paywall.noCommitment')}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dismissButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: Typography.fontSize.sm,
  },
  legalFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
  },
  legalLinkTouchable: {
    paddingVertical: Spacing.xs,
  },
  legalLinkText: {
    fontSize: Typography.fontSize.xs,
  },
  legalSeparator: {
    fontSize: Typography.fontSize.xs,
  },
});
