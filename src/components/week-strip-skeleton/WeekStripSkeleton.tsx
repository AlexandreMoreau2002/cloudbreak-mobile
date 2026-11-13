/**
 * WeekStripSkeleton — skeleton loader pour WeekStrip.
 * Reproduit 7 pastilles de jour, chacune avec un libelle jour et une date courte.
 */
import { useTheme } from '@/contexts/ThemeContext';
import { Radius, Spacing } from '@/constants/spacing';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SkeletonBlock, useSkeletonColor } from '@/components/skeleton-block';

const DAY_COUNT = 7;

export function WeekStripSkeleton() {
  const { colors } = useTheme();
  const blockColor = useSkeletonColor();

  return (
    <View testID="week-strip-skeleton">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {Array.from({ length: DAY_COUNT }, (_, i) => (
          <View
            key={i}
            testID={`week-strip-skeleton-day-${i}`}
            style={[styles.dayPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <SkeletonBlock width={30} height={12} color={blockColor} />
            <SkeletonBlock width={40} height={10} color={blockColor} style={{ marginTop: 2 }} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  dayPill: {
    minWidth: 62,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
});
