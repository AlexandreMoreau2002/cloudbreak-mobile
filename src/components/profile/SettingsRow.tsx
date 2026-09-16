import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  chevron?: boolean;
};

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  isLast,
  tone = 'default',
  disabled = false,
  chevron = true,
}: Props) {
  const { colors, typography } = useTheme();
  const danger = tone === 'danger';
  const fg = danger ? '#C25C4A' : colors.textPrimary;
  const showChevron = chevron && !danger && onPress !== undefined;

  const content = (
    <>
      <Ionicons
        name={icon}
        size={18}
        color={danger ? fg : colors.textSecondary}
        style={styles.icon}
      />
      <Text style={[styles.label, { color: fg, fontFamily: typography.fontFamily.regular }]}>
        {label}
      </Text>
      {value && (
        <Text style={[styles.value, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {value}
        </Text>
      )}
      {showChevron && (
        <Ionicons
          testID="settings-row-chevron"
          name="chevron-forward"
          size={16}
          color={colors.textSecondary}
        />
      )}
    </>
  );

  const rowStyle = [
    styles.row,
    !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
    disabled && styles.disabled,
  ];

  if (!onPress) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <TouchableOpacity
      style={rowStyle}
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      {content}
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
  disabled: { opacity: 0.45 },
  icon: { width: 20, textAlign: 'center' },
  label: { flex: 1, fontSize: 15, lineHeight: Math.round(15 * 1.5) },
  value: { fontSize: 15, lineHeight: Math.round(15 * 1.5) },
});
