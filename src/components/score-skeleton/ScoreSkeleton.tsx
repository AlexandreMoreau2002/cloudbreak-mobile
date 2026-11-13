/**
 * ScoreSkeleton — skeleton loader anime pour la ScoreCard.
 *
 * Reproduit la structure actuelle de ScoreCard : score + pill verdict a gauche,
 * visualisation nuage a droite, rangee de chips horaires en bas.
 * Affiche pendant le chargement du score (status === 'loading').
 */
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Radius, Spacing } from '@/constants/spacing';
import { SkeletonBlock, useSkeletonColor } from '@/components/skeleton-block';

const HOUR_CHIP_COUNT = 4;

export function ScoreSkeleton() {
  const { colors } = useTheme();
  const blockColor = useSkeletonColor();

  return (
    <View
      testID="score-skeleton"
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.heroColumn}>
          <SkeletonBlock width={120} height={54} color={blockColor} />
          <SkeletonBlock width={100} height={28} color={blockColor} style={{ borderRadius: Radius.full }} />
        </View>
        <View style={styles.vizWrapper}>
          <SkeletonBlock width={108} height={164} color={blockColor} style={{ borderRadius: Radius.md }} />
        </View>
      </View>
      <View style={styles.hourRow}>
        {Array.from({ length: HOUR_CHIP_COUNT }, (_, i) => (
          <SkeletonBlock
            key={i}
            testID={`score-skeleton-hour-${i}`}
            width={52}
            height={28}
            color={blockColor}
            style={{ borderRadius: Radius.sm }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  heroColumn: {
    flex: 1,
    gap: Spacing.xs,
    justifyContent: 'center',
  },
  vizWrapper: {
    width: 108,
  },
  hourRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
});
