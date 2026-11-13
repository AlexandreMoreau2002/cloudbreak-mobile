/**
 * HomeSkeleton — composeur des skeletons de la Home.
 * Empile PeakHeaderSkeleton, ScoreSkeleton, WeekStripSkeleton, ConditionsSkeleton
 * et FavoritesGridSkeleton dans le meme ordre que le rendu reel de index.tsx.
 */
import { StyleSheet, View } from 'react-native';
import { ScoreSkeleton } from '@/components/score-skeleton';
import { WeekStripSkeleton } from '@/components/week-strip-skeleton';
import { ConditionsSkeleton } from '@/components/conditions-skeleton';
import { PeakHeaderSkeleton } from '@/components/peak-header-skeleton';
import { FavoritesGridSkeleton } from '@/components/favorites-grid-skeleton';

export function HomeSkeleton() {
  return (
    <View testID="home-skeleton" style={styles.stack}>
      <PeakHeaderSkeleton />
      <ScoreSkeleton />
      <WeekStripSkeleton />
      <ConditionsSkeleton />
      <FavoritesGridSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
});
