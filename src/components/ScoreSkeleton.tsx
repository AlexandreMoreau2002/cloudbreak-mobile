/**
 * ScoreSkeleton — skeleton loader animé pour la ScoreCard.
 *
 * Reproduit la structure de ScoreCard avec des blocs animés en pulsation.
 * Affiché pendant le chargement du score (status === 'loading').
 */
import { useEffect, useRef } from 'react';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { Animated, StyleSheet, View } from 'react-native';

const { background: CARD_BG, border: BLOCK_COLOR } = Colors.dark;

function SkeletonBlock({ width, height, style }: { width: number | string; height: number; style?: object }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width: width as number, height, borderRadius: Radius.sm, opacity },
        style,
      ]}
    />
  );
}

export function ScoreSkeleton() {
  return (
    <View testID="score-skeleton" style={styles.card}>
      {/* Peak name */}
      <SkeletonBlock width={160} height={22} />
      {/* Altitude */}
      <SkeletonBlock width={60} height={14} />
      {/* Score hero */}
      <SkeletonBlock width={120} height={72} style={{ marginVertical: Spacing.sm }} />
      {/* Verdict pill */}
      <SkeletonBlock width={180} height={36} style={{ borderRadius: Radius.full }} />
      {/* Date */}
      <SkeletonBlock width={200} height={14} style={{ marginTop: Spacing.xs }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  block: {
    backgroundColor: BLOCK_COLOR,
  },
});
