import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
  isLast?: boolean;
};

export function SettingsRow({ icon, label, value, onPress, isLast }: Props) {
  const { colors, typography } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={18} color={colors.textSecondary} style={styles.icon} />
      <Text style={[styles.label, { color: colors.textPrimary, fontFamily: typography.fontFamily.regular }]}>
        {label}
      </Text>
      <Text style={[styles.value, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {value}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  icon: { width: 20, textAlign: 'center' },
  label: { flex: 1, fontSize: 15, lineHeight: Math.round(15 * 1.5) },
  value: { fontSize: 15, lineHeight: Math.round(15 * 1.5) },
});
