/**
 * PeakHeaderSkeleton — skeleton loader pour PeakHeader.
 * Reproduit : nom du sommet, ligne altitude/region, 2 boutons ronds (favori/partage).
 */
import { Radius } from '@/constants/spacing';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { SkeletonBlock, useSkeletonColor } from '@/components/skeleton-block';

const ICON_BUTTON_COUNT = 2;

export function PeakHeaderSkeleton() {
  const { colors } = useTheme();
  const blockColor = useSkeletonColor();

  return (
    <View testID="peak-header-skeleton" style={styles.peakHeader}>
      <View style={styles.peakHeaderLeft}>
        <SkeletonBlock width={160} height={22} color={blockColor} />
        <SkeletonBlock width={100} height={14} color={blockColor} />
      </View>
      <View style={styles.buttonRow}>
        {Array.from({ length: ICON_BUTTON_COUNT }, (_, i) => (
          <View
            key={i}
            style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <SkeletonBlock width={18} height={18} color={blockColor} style={{ borderRadius: Radius.sm }} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  peakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  peakHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
