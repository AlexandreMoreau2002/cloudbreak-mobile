import i18n from '@/utils/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import type { Peak } from '@/services/mockData/types';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface FavoritesGridProps {
  favorites: Peak[];
  onSelectPeak: (peak: Peak) => void;
}

export function FavoritesGrid({ favorites, onSelectPeak }: FavoritesGridProps) {
  const { colors, typography } = useTheme();

  if (favorites.length === 0) return null;

  return (
    <View style={styles.favoritesSection}>
      <Text style={[styles.favoritesSectionLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }]}>
        {i18n.t('home.sectionFavorites').toUpperCase()}
      </Text>
      <View style={styles.favoritesGrid}>
        {favorites.map((peak) => (
          <TouchableOpacity
            key={peak.id}
            testID={`favorite-peak-${peak.id}`}
            style={[styles.favoritePeakCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => onSelectPeak(peak)}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.favoritePeakName, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }]}
              numberOfLines={1}
            >
              {peak.name}
            </Text>
            <Text style={[styles.favoritePeakAlt, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }]}>
              {peak.altitude} m
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  favoritesSection: {
    gap: 12,
    width: '100%',
  },
  favoritesSectionLabel: {
    letterSpacing: 1,
  },
  favoritesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  favoritePeakCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 4,
  },
  favoritePeakName: {
    letterSpacing: 0.3,
  },
  favoritePeakAlt: {},
});
