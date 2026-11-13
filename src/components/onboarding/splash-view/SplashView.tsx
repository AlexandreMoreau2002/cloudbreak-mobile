/**
 * SplashView — écran d'ouverture animé (story 7.1).
 *
 * Séquence chorégraphiée (fidèle au prototype styles.css) :
 *  1. la mascotte "pop" à l'entrée : scale 0.78→1.06→1 + translateY 18→-6→0,
 *     720ms bezier(.22,.61,.36,1), puis enchaîne un bob idle infini
 *     (translateY 0→-3 + rotate ±1°, 2.6s ease-in-out) qui démarre pile
 *     quand le pop se pose (delay 720ms) pour un raccord fluide ;
 *  2. le wordmark "Cloudbreak" monte en fondu (translateY 14→0 + opacity),
 *     800ms, delay 160ms ;
 *  3. la tagline apparaît en fade-up (translateY 8→0 + opacity), 520ms,
 *     delay 240ms.
 *
 * Après 1800ms, `onDone()` est appelé (timer nettoyé au démontage).
 */
import i18n from '@/utils/i18n';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  CURVE,
  useMascotBob,
  bobRotateDeg,
  bobTranslateY,
  getMascotAssets,
} from '@/components/onboarding/mascot-motion';
import Animated, {
  withDelay,
  withTiming,
  interpolate,
  withSequence,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

const SPLASH_DURATION_MS = 1800;
const POP_MS = 720;

export interface SplashViewProps {
  onDone: () => void;
}

export function SplashView({ onDone }: SplashViewProps) {
  const { colors, scheme, typography } = useTheme();

  const enter = useSharedValue(0);
  const wordmark = useSharedValue(0);
  const tagline = useSharedValue(0);
  // Le bob idle démarre quand le pop se pose (delay 720ms) → raccord sans à-coup.
  const { bob, amplitude, rotation } = useMascotBob({ delayMs: POP_MS });

  useEffect(() => {
    enter.value = withSequence(
      withTiming(0.55, { duration: POP_MS * 0.55, easing: CURVE }),
      withTiming(1, { duration: POP_MS * 0.45, easing: CURVE }),
    );
    wordmark.value = withDelay(160, withTiming(1, { duration: 800, easing: CURVE }));
    tagline.value = withDelay(240, withTiming(1, { duration: 520, easing: CURVE }));
  }, [enter, wordmark, tagline]);

  useEffect(() => {
    const id = setTimeout(onDone, SPLASH_DURATION_MS);
    return () => clearTimeout(id);
  }, [onDone]);

  const mascotStyle = useAnimatedStyle(() => {
    const enterY = interpolate(enter.value, [0, 0.55, 1], [18, -6, 0]);
    const enterScale = interpolate(enter.value, [0, 0.55, 1], [0.78, 1.06, 1]);
    const bobY = bobTranslateY(bob.value, amplitude);
    const bobRot = bobRotateDeg(bob.value, rotation);
    return {
      opacity: interpolate(enter.value, [0, 0.55, 1], [0, 1, 1]),
      transform: [
        { translateY: enterY + bobY },
        { rotate: `${bobRot}deg` },
        { scale: enterScale },
      ],
    };
  });

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmark.value,
    transform: [{ translateY: interpolate(wordmark.value, [0, 1], [14, 0]) }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.value,
    transform: [{ translateY: interpolate(tagline.value, [0, 1], [8, 0]) }],
  }));

  const { src: mascotSrc, shadowColor } = getMascotAssets(scheme, colors.accent);
  /* istanbul ignore next -- visual-only light/dark styling, exercised by native rendering */
  const mascotShadow = { shadowColor, shadowOpacity: scheme === 'dark' ? 0.55 : 0.28 };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.Image
        testID="splash-mascot"
        source={mascotSrc}
        accessibilityIgnoresInvertColors
        style={[styles.mascot, mascotShadow, mascotStyle]}
      />
      <View style={styles.textBlock}>
        <Animated.Text
          style={[
            styles.wordmark,
            { color: colors.textPrimary, fontFamily: typography.fontFamily.light },
            wordmarkStyle,
          ]}
        >
          Cloudbreak
        </Animated.Text>
        <Animated.Text
          style={[
            styles.tagline,
            { color: colors.textDisabled, fontFamily: typography.fontFamily.semiBold },
            taglineStyle,
          ]}
        >
          {i18n.t('onboarding.tagline')}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  mascot: {
    width: 132,
    height: 132,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 32,
  },
  textBlock: {
    alignItems: 'center',
  },
  wordmark: {
    fontSize: 52,
    lineHeight: 52,
    letterSpacing: -1.56,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
