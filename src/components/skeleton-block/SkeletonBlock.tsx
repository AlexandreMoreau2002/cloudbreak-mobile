/**
 * SkeletonBlock — bloc de base des skeleton loaders.
 *
 * Effet shimmer : un degrade lumineux balaye le bloc de droite a gauche
 * en boucle (translateX anime de +largeur vers -largeur, largeur mesuree
 * via onLayout). Le fond du bloc reste opaque et stable.
 */
import { Radius } from '@/constants/spacing';
import { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';

const SHIMMER_DURATION_MS = 1300;

interface SkeletonBlockProps {
  width: ViewStyle['width'];
  height: number;
  color: string;
  style?: ViewStyle;
  testID?: string;
}

export function SkeletonBlock({ width, height, color, style, testID }: SkeletonBlockProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [measuredWidth, setMeasuredWidth] = useState(0);

  useEffect(() => {
    if (measuredWidth === 0) return;
    translateX.setValue(measuredWidth);
    const anim = Animated.loop(
      Animated.timing(translateX, {
        toValue: -measuredWidth,
        duration: SHIMMER_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [measuredWidth, translateX]);

  function handleLayout(event: LayoutChangeEvent) {
    setMeasuredWidth(event.nativeEvent.layout.width);
  }

  return (
    <View
      testID={testID}
      onLayout={handleLayout}
      style={[
        styles.block,
        { width, height, backgroundColor: color, borderRadius: Radius.sm },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={['transparent', 'rgba(210,186,156,0.35)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    overflow: 'hidden',
  },
});
