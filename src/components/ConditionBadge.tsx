import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { StyleSheet, Text, View } from 'react-native';

const { textPrimary: CARD_TEXT, textSecondary: CARD_TEXT_DIM } = Colors.dark;

interface ConditionBadgeProps {
  label: string;
  value: string;
}

export function ConditionBadge({ label, value }: ConditionBadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 132,
    flexGrow: 1,
    backgroundColor: '#FFFFFF12',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  value: {
    color: CARD_TEXT,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.md,
  },
  label: {
    color: CARD_TEXT_DIM,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
