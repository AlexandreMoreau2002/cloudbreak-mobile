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
        { borderRadius: Radius.sm, opacity },
        { width, height, backgroundColor: color },
        style,
      ]}
    />
  );
}

function SkeletonItem({ color, borderColor, surface }: { color: string; borderColor: string; surface: string }) {
  return (
    <View
      testID="favorites-skeleton-item"
      style={[styles.item, { backgroundColor: surface, borderColor }]}
    >
      <SkeletonBlock width={48} height={24} color={color} style={{ borderRadius: Radius.sm }} />
      <SkeletonBlock width={140} height={16} color={color} style={{ flex: 1 }} />
      <SkeletonBlock width={32} height={32} color={color} style={{ borderRadius: Radius.full }} />
    </View>
  );
}

export function FavoritesSkeleton() {
  const { colors, scheme } = useTheme();
  const blockColor = scheme === 'dark' ? '#3A3A3A' : '#E9E4DA';

  return (
    <View testID="favorites-skeleton" style={styles.container}>
      <SkeletonItem color={blockColor} borderColor={colors.border} surface={colors.surface} />
      <SkeletonItem color={blockColor} borderColor={colors.border} surface={colors.surface} />
      <SkeletonItem color={blockColor} borderColor={colors.border} surface={colors.surface} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
});
