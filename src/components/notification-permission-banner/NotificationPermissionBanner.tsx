import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import i18n from '@/utils/i18n';
import { useTheme } from '@/contexts/ThemeContext';

export interface NotificationPermissionBannerProps {
  onOpenSettings: () => void;
}

export function NotificationPermissionBanner({ onOpenSettings }: NotificationPermissionBannerProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View
      testID="notification-permission-banner"
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border, gap: spacing.sm }]}
    >
      <View style={[styles.row, { gap: spacing.sm }]}>
        <Ionicons
          name="notifications-off-outline"
          size={18}
          color={colors.textPrimary}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <Text
          accessibilityRole="header"
          style={{
            color: colors.textPrimary,
            fontFamily: typography.fontFamily.bold,
            fontSize: typography.fontSize.sm,
            lineHeight: Math.round(typography.fontSize.sm * typography.lineHeight.normal),
          }}
        >
          {i18n.t('notifications.permissionDeniedTitle')}
        </Text>
      </View>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.fontSize.sm,
        }}
      >
        {i18n.t('notifications.permissionDeniedMessage')}
      </Text>
      <TouchableOpacity
        testID="notification-permission-banner-button"
        accessibilityRole="button"
        onPress={onOpenSettings}
        style={[styles.button, { backgroundColor: colors.accent }]}
      >
        <Text style={[styles.buttonLabel, { color: colors.background, fontFamily: typography.fontFamily.bold }]}>
          {i18n.t('notifications.openSettings')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  button: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  buttonLabel: { fontSize: 13 },
});
