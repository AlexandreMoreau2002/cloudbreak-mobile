/**
 * ScoreSkeleton — skeleton loader animé pour la ScoreCard.
 *
 * Reproduit la structure de ScoreCard avec des blocs animés en pulsation.
 * Affiché pendant le chargement du score (status === 'loading').
 */
import { useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Radius, Spacing } from '@/constants/spacing';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

function SkeletonBlock({
  width,
  height,
  color,
  style,
}: {
  width: ViewStyle['width'];
  height: number;
  color: string;
  style?: ViewStyle;
}) {
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
        { width, height, backgroundColor: color, borderRadius: Radius.sm, opacity },
        style,
      ]}
    />
  );
}

export function ScoreSkeleton() {
  const { colors, scheme } = useTheme();
  const blockColor = scheme === 'dark' ? '#3A3A3A' : '#E9E4DA';

  return (
    <View
      testID="score-skeleton"
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Peak name */}
      <SkeletonBlock width={160} height={22} color={blockColor} />
      {/* Altitude */}
      <SkeletonBlock width={60} height={14} color={blockColor} />
      {/* Score hero */}
      <SkeletonBlock width={120} height={72} color={blockColor} style={{ marginVertical: Spacing.sm }} />
      {/* Verdict pill */}
      <SkeletonBlock width={180} height={36} color={blockColor} style={{ borderRadius: Radius.full }} />
      {/* Date */}
      <SkeletonBlock width={200} height={14} color={blockColor} style={{ marginTop: Spacing.xs }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
  },
  block: {},
});
