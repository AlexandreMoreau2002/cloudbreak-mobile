/**
 * EmptyState — composant générique pour les états vides et messages d'information.
 *
 * Usage :
 *   <EmptyState
 *     icon="heart-outline"
 *     title={i18n.t('favorites.empty')}
 *     subtitle={i18n.t('favorites.emptyHint')}
 *   />
 *   <EmptyState
 *     icon="search-outline"
 *     title={i18n.t('search.noResults')}
 *     ctaLabel={i18n.t('search.goBack')}
 *     onCta={() => router.back()}
 *   />
 */
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ icon, title, subtitle, ctaLabel, onCta }: EmptyStateProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons
        name={icon as React.ComponentProps<typeof Ionicons>['name']}
        size={48}
        color={colors.textDisabled}
        style={{ marginBottom: spacing.md }}
      />
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: typography.fontFamily.semiBold,
          fontSize: typography.fontSize.md,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            color: colors.textDisabled,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.fontSize.sm,
            textAlign: 'center',
            marginTop: spacing.sm,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
      {ctaLabel && onCta ? (
        <TouchableOpacity
          onPress={onCta}
          activeOpacity={0.75}
          style={[styles.cta, { backgroundColor: colors.accent, marginTop: spacing.lg }]}
        >
          <Text
            style={{
              color: colors.surface,
              fontFamily: typography.fontFamily.semiBold,
              fontSize: typography.fontSize.sm,
            }}
          >
            {ctaLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  cta: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
});
