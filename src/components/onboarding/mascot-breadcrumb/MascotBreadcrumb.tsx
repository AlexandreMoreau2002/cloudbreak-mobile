/**
 * MascotBreadcrumb — "fil d'Ariane" animé de l'onboarding.
 *
 * Une mascotte glisse le long d'une ligne fine entre les waypoints, à une
 * position proportionnelle à `active / (total - 1)`. Derrière elle, la traînée
 * se remplit jusqu'à sa position ; le stop courant porte un halo pulsé.
 *
 * Fidélité mouvement (prototype styles.css) :
 *  - traînée + mascotte pilotées par UNE seule valeur `progress` → synchro
 *    parfaite (withTiming 560ms, bezier .22/.61/.36/1)
 *  - bob continu : translateY ±3px + rotate ±1° en boucle 2.6s ease-in-out
 *  - pop au changement d'étape : scale 0.78→1.06→1 / translateY 18→-6→0, 720ms
 *  - halo du stop courant : scale 1→2.6 + fondu, boucle 1.8s ease-out
 */
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  withTiming,
  withRepeat,
  interpolate,
  withSequence,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import {
  CURVE,
  useMascotBob,
  bobRotateDeg,
  bobTranslateY,
  getMascotAssets,
} from '@/components/onboarding/mascot-motion';

const PAD = 28;
const HEIGHT = 76;
const STOP = 10;
const MASCOT = 64;
const TRACK_BOTTOM = 14;
const LINE_CENTER = TRACK_BOTTOM + 1; // ligne 2px → centre à 15px du bas
const STOP_BOTTOM = LINE_CENTER - STOP / 2;

export interface MascotBreadcrumbProps {
  active: number;
  total?: number;
}

export function MascotBreadcrumb({ active, total = 3 }: MascotBreadcrumbProps) {
  const { colors, scheme } = useTheme();
  const [containerW, setContainerW] = useState(0);

  const pct = total > 1 ? active / (total - 1) : 0;
  const trackWidth = Math.max(containerW - PAD * 2, 0);

  const trackW = useSharedValue(0);
  const progress = useSharedValue(pct);
  const pop = useSharedValue(0);
  const halo = useSharedValue(0);
  const { bob, amplitude, rotation } = useMascotBob();

  // Halo pulsé du stop courant — boucle continue.
  useEffect(() => {
    halo.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }), -1, false);
  }, [halo]);

  // Progression (traînée + position mascotte) : rejoue à chaque changement d'étape.
  useEffect(() => {
    progress.value = withTiming(pct, { duration: 560, easing: CURVE });
  }, [pct, progress]);

  // Pop de la mascotte : rejoué au montage et à chaque changement d'`active`.
  useEffect(() => {
    pop.value = 0;
    pop.value = withSequence(
      withTiming(0.55, { duration: 396, easing: CURVE }),
      withTiming(1, { duration: 324, easing: CURVE }),
    );
  }, [active, pop]);

  const trailStyle = useAnimatedStyle(() => ({
    width: trackW.value * progress.value,
  }));

  const mascotStyle = useAnimatedStyle(() => {
    const bobY = bobTranslateY(bob.value, amplitude);
    const bobRot = bobRotateDeg(bob.value, rotation);
    const popY = interpolate(pop.value, [0, 0.55, 1], [18, -6, 0]);
    const popScale = interpolate(pop.value, [0, 0.55, 1], [0.78, 1.06, 1]);
    return {
      opacity: interpolate(pop.value, [0, 0.55, 1], [0, 1, 1]),
      transform: [
        { translateX: trackW.value * progress.value - MASCOT / 2 },
        { translateY: bobY + popY },
        { rotate: `${bobRot}deg` },
        { scale: popScale },
      ],
    };
  });

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(halo.value, [0, 1], [0.35, 0]),
    transform: [{ scale: interpolate(halo.value, [0, 1], [1, 2.6]) }],
  }));

  function handleLayout(event: LayoutChangeEvent) {
    const w = event.nativeEvent.layout.width;
    setContainerW(w);
    trackW.value = Math.max(w - PAD * 2, 0);
  }

  const { src: mascotSrc } = getMascotAssets(scheme, colors.accent);

  return (
    <View
      onLayout={handleLayout}
      style={styles.container}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Rail — trait fin */}
      <View style={[styles.track, { left: PAD, right: PAD, backgroundColor: colors.border }]} />

      {/* Traînée remplie */}
      <Animated.View style={[styles.trail, { left: PAD, backgroundColor: colors.accent }, trailStyle]} />

      {/* Halo pulsé du stop courant */}
      {trackWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              left: PAD + trackWidth * pct - STOP / 2,
              backgroundColor: colors.accent,
            },
            haloStyle,
          ]}
        />
      ) : null}

      {/* Stops */}
      {Array.from({ length: total }).map((_, i) => {
        const stopPct = total > 1 ? i / (total - 1) : 0;
        const filled = i <= active;
        return (
          <View
            key={i}
            testID={`breadcrumb-stop-${i}`}
            style={[
              styles.stop,
              {
                left: PAD + trackWidth * stopPct - STOP / 2,
                backgroundColor: filled ? colors.accent : colors.surface,
                borderColor: filled ? colors.accent : colors.border,
              },
            ]}
          >
            {filled ? (
              <View testID={`breadcrumb-stop-${i}-filled`} style={styles.stopFill} />
            ) : null}
          </View>
        );
      })}

      <Animated.View style={[styles.mascotWrap, { left: PAD }, mascotStyle]}>
        <Image
          testID="breadcrumb-mascot"
          source={mascotSrc}
          accessibilityIgnoresInvertColors
          style={styles.mascotImage}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    height: HEIGHT,
    width: '100%',
  },
  track: {
    position: 'absolute',
    bottom: TRACK_BOTTOM,
    height: 2,
    borderRadius: 2,
  },
  trail: {
    position: 'absolute',
    bottom: TRACK_BOTTOM,
    height: 2,
    borderRadius: 2,
  },
  halo: {
    position: 'absolute',
    bottom: STOP_BOTTOM,
    width: STOP,
    height: STOP,
    borderRadius: STOP / 2,
  },
  stop: {
    position: 'absolute',
    bottom: STOP_BOTTOM,
    width: STOP,
    height: STOP,
    borderRadius: STOP / 2,
    borderWidth: 2,
  },
  stopFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: STOP / 2,
  },
  mascotWrap: {
    position: 'absolute',
    bottom: 8,
    width: MASCOT,
    height: MASCOT,
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },
});
