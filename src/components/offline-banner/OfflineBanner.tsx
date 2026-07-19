import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import i18n from '@/utils/i18n';
import { useTheme } from '@/contexts/ThemeContext';

export interface OfflineBannerProps {
  cachedAt: number;
}

function formatCacheTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}h${minutes}`;
}

export function OfflineBanner({ cachedAt }: OfflineBannerProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border, gap: spacing.sm },
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={colors.textSecondary} />
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.fontSize.xs,
          flex: 1,
        }}
      >
        {i18n.t('home.offlineBanner', { time: formatCacheTime(cachedAt) })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
