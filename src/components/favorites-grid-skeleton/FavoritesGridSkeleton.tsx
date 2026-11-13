/**
 * FavoritesGridSkeleton — skeleton loader pour FavoritesGrid.
 * Reproduit le label de section et une grille 2x2 de cartes favori.
 */
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { SkeletonBlock, useSkeletonColor } from '@/components/skeleton-block';

const CARD_COUNT = 4;

export function FavoritesGridSkeleton() {
  const { colors } = useTheme();
  const blockColor = useSkeletonColor();

  return (
    <View testID="favorites-grid-skeleton" style={styles.favoritesSection}>
      <SkeletonBlock width={120} height={12} color={blockColor} />
      <View style={styles.favoritesGrid}>
        {Array.from({ length: CARD_COUNT }, (_, i) => (
          <View
            key={i}
            testID={`favorites-grid-skeleton-card-${i}`}
            style={[styles.favoritePeakCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <SkeletonBlock width={80} height={14} color={blockColor} />
            <SkeletonBlock width={40} height={12} color={blockColor} style={{ marginTop: 4 }} />
          </View>
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
  },
});
