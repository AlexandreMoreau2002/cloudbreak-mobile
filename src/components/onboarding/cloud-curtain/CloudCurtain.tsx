/**
 * CloudCurtain — transition cinématique « mer de nuages » (story 7.1, B14).
 *
 * Rideau plein écran joué UNE fois au passage splash → onboarding 1. Trois
 * phases lisibles (prototype `CloudTransition`, cb-transition.jsx + styles.css
 * l.461-716) :
 *   RISE  0→28%  (~700ms) — le rideau monte de translateY(100%) à 0, la
 *                           mascotte grimpe depuis le bas-gauche sur la crête
 *   HOLD  28→66% (~950ms) — le rideau couvre tout, la mascotte surfe la crête
 *                           de gauche à droite (le swap de route a lieu à 880ms)
 *   EXIT  66→100%(~850ms) — le rideau glisse jusqu'à translateY(-105%) et
 *                           révèle l'écran dessous ; la mascotte sort en haut
 *
 * Fidélité mouvement :
 *  - Rideau : withSequence par segment, easing bezier(.5,.02,.3,1) appliqué à
 *    CHAQUE segment (fidèle au keyframes CSS `cb-curtain` l.503-508, où l'easing
 *    global s'applique entre chaque paire de keyframes).
 *  - Chemin mascotte : progress linéaire 0→1 sur 2500ms (fidèle à
 *    `cb-curtain-mascot-path` 45 keyframes, timing `linear` l.519). Les formules
 *    analytiques (RISE easeOutCubic, HOLD sin, EXIT easeInCubic) approximent la
 *    table mais dérivent aux bornes (ex. Y HOLD revient à +2 au lieu de −8 à
 *    68%) → on REJOUE la table bakée telle quelle via `interpolate`, ce qui
 *    reproduit EXACTEMENT la courbe CSS (piecewise-linear entre keyframes, timing
 *    linéaire) — déviation 0px sur les 45 échantillons. Fidélité > élégance.
 *  - Float continu : sinus centré ±5px Y / ±1.5° rot, cycle 3.2s linéaire
 *    (fidèle `cb-curtain-mascot-float` l.592-716). La boucle useMascotBob du
 *    module partagé est un ping-pong 0↔1 repos-à-0 → −amp : incapable de
 *    produire un sinus CENTRÉ qui descend PUIS remonte au-dessus de 0. On
 *    implémente donc notre propre phase linéaire 0→1 et on calcule le sinus
 *    exact (Y=−5·sin(2πp), rot=−1.5·cos(2πp)) dans un worklet — maths exactes.
 *
 * Hypothèse d'échelle : les valeurs px du prototype (translate, tailles) sont
 * traitées comme des dp directement (1px CSS ≈ 1dp RN pour cette maquette).
 */
import { useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { getMascotAssets } from '@/components/onboarding/mascot-motion';
import Svg, { Rect, Path, Stop, Defs, Ellipse, LinearGradient } from 'react-native-svg';
import Animated, {
  Easing,
  withRepeat,
  interpolate,
  withTiming,
  withSequence,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

export interface CloudCurtainProps {
  /** Swap de la route sous-jacente pendant que le rideau couvre (≈ 880ms). */
  onSwap: () => void;
  /** Fin de la transition — le rideau a quitté l'écran (2500ms). */
  onDone: () => void;
}

// ── Timings du rideau (fidèle keyframes CSS `cb-curtain` l.503-508) ──────────
const RISE_MS = 700; //  0→28% : montée 100%→0
const HOLD_MS = 950; // 28→66% : maintien à 0
const EXIT_MS = 850; // 66→100%: sortie 0→-105%  (total 2500ms)
const PATH_MS = 2500; // durée du chemin mascotte (linéaire)
const EXIT_OVERSHOOT = 1.05; // translateY(-105%) — le rideau dépasse le haut

// Easing par segment (prototype `cb-curtain` l.500 : cubic-bezier(.5,.02,.3,1)).
const CURTAIN_EASE = Easing.bezier(0.5, 0.02, 0.3, 1);

// ── Callbacks temporisés (prototype : swap ~880ms, onDone 2500ms) ────────────
const SWAP_MS = 880; // swap de route en début de HOLD, écran caché
const DONE_MS = 2500; // fin de transition

// ── Float continu de la mascotte (prototype `cb-curtain-mascot-float`) ───────
const FLOAT_MS = 3200; // cycle 3.2s linéaire (l.586)
const FLOAT_AMP_Y = 5; // ±5px, Y=−5·sin(2πp) → descend d'abord (l.593-625)
const FLOAT_AMP_ROT = 1.5; // ±1.5°, rot=−1.5·cos(2πp) → −1.5° à p=0 (l.595)
const TWO_PI = Math.PI * 2;

// ── Boîte mascotte (prototype `.cb-curtain-mascot` l.514-518) ────────────────
const MASCOT_SIZE = 132; // 132×132px → dp

// ── Table bakée du chemin mascotte (prototype `cb-curtain-mascot-path`,
//    styles.css l.527-571 : 45 keyframes, timing linéaire). On rejoue la table
//    telle quelle par `interpolate` — reproduction exacte de la courbe CSS.
//    Vérification (formules analytiques du prompt vs table, en px) :
//      t=13%    RISE : easeOutCubic → (-7.8, 13.0) s0.891  ✓ = keyframe
//      t=51.67% HOLD : formule sin → (157.7, -10.8) vs table (158.9, -11.6)
//                      → écart 1.2px / 0.8px : la table gagne (rejouée exacte)
//      t=68%    HOLD : formule sin Y=+2 vs table Y=-8 → écart 10px : formule
//                      REJETÉE, table bakée utilisée → 0px de déviation partout
const PATH_T = [
  0.0, 0.0186, 0.0371, 0.0557, 0.0743, 0.0929, 0.1114, 0.13, 0.1486, 0.1671,
  0.1857, 0.2043, 0.2229, 0.2414, 0.26, 0.2833, 0.3067, 0.33, 0.3533, 0.3767,
  0.4, 0.4233, 0.4467, 0.47, 0.4933, 0.5167, 0.54, 0.5633, 0.5867, 0.61, 0.6333,
  0.6567, 0.68, 0.7067, 0.7333, 0.76, 0.7867, 0.8133, 0.84, 0.8667, 0.8933,
  0.92, 0.9467, 0.9733, 1.0,
];
const PATH_X = [
  -118.0, -92.9, -71.3, -53.1, -37.9, -25.5, -15.5, -7.8, -1.9, 2.3, 5.1, 6.8,
  7.6, 8.0, 8.0, 21.7, 35.4, 49.2, 62.9, 76.6, 90.3, 104.1, 117.8, 131.5, 145.2,
  158.9, 172.7, 186.4, 200.1, 213.8, 227.6, 241.3, 255.0, 257.9, 260.8, 263.8,
  266.7, 269.6, 272.5, 275.4, 278.3, 281.3, 284.2, 287.1, 290.0,
];
const PATH_Y = [
  90.0, 72.5, 57.4, 44.7, 34.1, 25.4, 18.4, 13.0, 8.9, 6.0, 4.1, 2.9, 2.3, 2.0,
  2.0, 0.1, -1.8, -3.7, -5.4, -6.9, -8.3, -9.4, -10.3, -11.0, -11.4, -11.6,
  -11.6, -11.4, -10.9, -10.3, -9.6, -8.8, -8.0, -8.2, -9.4, -12.9, -19.6, -30.6,
  -47.0, -69.9, -100.4, -139.6, -188.6, -248.3, -320.0,
];
const PATH_SCALE = [
  0.48, 0.574, 0.654, 0.722, 0.779, 0.825, 0.862, 0.891, 0.913, 0.929, 0.939,
  0.945, 0.949, 0.95, 0.95, 0.953, 0.956, 0.958, 0.961, 0.964, 0.967, 0.969,
  0.972, 0.975, 0.978, 0.981, 0.983, 0.986, 0.989, 0.992, 0.994, 0.997, 1.0,
  0.982, 0.963, 0.945, 0.927, 0.908, 0.89, 0.872, 0.853, 0.835, 0.817, 0.798,
  0.78,
];
const PATH_OPACITY = [
  0.0, 0.598, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
  1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
  1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.972, 0.833, 0.694, 0.556, 0.417, 0.278,
  0.139, 0.0,
];

// ── Paths SVG du rideau (exacts, prototype cb-transition.jsx l.71-125) ────────
const MOUNTAINS =
  'M0,340 L 56,242 L 112,300 L 172,200 L 232,278 L 290,232 L 348,288 L 400,250 L 400,340 Z';
const DISTANT_BAND =
  'M0,316 C 60,300 120,308 180,318 C 240,328 296,304 352,316 C 376,322 392,322 400,322 L 400,360 L 0,360 Z';
const BACK_WAVE =
  'M0,348 C 56,310 112,316 168,338 C 224,360 268,310 320,326 C 354,336 380,344 400,348 L 400,900 L 0,900 Z';
const FRONT_WAVE =
  'M0,402 C 60,350 124,372 188,398 C 248,422 296,360 348,388 C 372,400 388,398 400,402 L 400,900 L 0,900 Z';
const DEPTH_BUMP_1 =
  'M0,540 C 50,520 110,528 170,540 C 230,552 280,524 340,536 C 370,542 392,544 400,544 L 400,575 L 0,575 Z';
const DEPTH_BUMP_2 =
  'M0,680 C 60,664 120,672 180,682 C 240,692 296,668 352,680 C 376,686 392,686 400,686 L 400,712 L 0,712 Z';

export function CloudCurtain({ onSwap, onDone }: CloudCurtainProps) {
  const { colors, scheme } = useTheme();
  const { height } = useWindowDimensions();

  // Rideau : démarre hors écran en bas (translateY = hauteur = 100%).
  const curtainY = useSharedValue(height);
  // Chemin mascotte : progression linéaire 0→1 sur 2500ms.
  const pathProgress = useSharedValue(0);
  // Float : phase linéaire 0→1 rebouclée toutes les 3.2s.
  const floatPhase = useSharedValue(0);

  useEffect(() => {
    // Rideau : montée → maintien → sortie, easing appliqué PAR segment.
    curtainY.value = height;
    curtainY.value = withSequence(
      withTiming(0, { duration: RISE_MS, easing: CURTAIN_EASE }),
      withTiming(0, { duration: HOLD_MS, easing: CURTAIN_EASE }),
      withTiming(-EXIT_OVERSHOOT * height, { duration: EXIT_MS, easing: CURTAIN_EASE }),
    );
    // Chemin mascotte : linéaire strict (le relief vient de la table bakée).
    pathProgress.value = 0;
    pathProgress.value = withTiming(1, { duration: PATH_MS, easing: Easing.linear });
    // Float : boucle linéaire infinie (pas de reverse → phase 0→1 continue,
    // rebouclée → sinus continu). withRepeat(-1) = cycles illimités.
    floatPhase.value = 0;
    floatPhase.value = withRepeat(
      withTiming(1, { duration: FLOAT_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [height, curtainY, pathProgress, floatPhase]);

  // Callbacks temporisés — refs stables pour lire les callbacks les plus récents.
  // Chaque timer est créé une seule fois ; le cleanup garantit qu'il ne survivra
  // pas au démontage.
  const onSwapRef = useRef(onSwap);
  const onDoneRef = useRef(onDone);
  onSwapRef.current = onSwap;
  onDoneRef.current = onDone;

  useEffect(() => {
    const swapTimer = setTimeout(() => {
      onSwapRef.current();
    }, SWAP_MS);
    const doneTimer = setTimeout(() => {
      onDoneRef.current();
    }, DONE_MS);
    return () => {
      clearTimeout(swapTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  const curtainStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: curtainY.value }],
  }));

  // Chemin : translate/scale/opacity rejoués depuis la table bakée (exact).
  const pathStyle = useAnimatedStyle(() => {
    const t = pathProgress.value;
    return {
      opacity: interpolate(t, PATH_T, PATH_OPACITY),
      transform: [
        { translateX: interpolate(t, PATH_T, PATH_X) },
        { translateY: interpolate(t, PATH_T, PATH_Y) },
        { scale: interpolate(t, PATH_T, PATH_SCALE) },
      ],
    };
  });

  // Float : sinus centré exact, indépendant du chemin (composé sur l'Image).
  const floatStyle = useAnimatedStyle(() => {
    const p = floatPhase.value;
    const y = -FLOAT_AMP_Y * Math.sin(TWO_PI * p);
    const rot = -FLOAT_AMP_ROT * Math.cos(TWO_PI * p);
    return {
      transform: [{ translateY: y }, { rotate: `${rot}deg` }],
    };
  });

  const { src: mascotSrc, shadowColor } = getMascotAssets(scheme, colors.accent);
  // Ombre portée (prototype `.cb-curtain-mascot-img` l.585 / dark l.590).
  /* istanbul ignore next -- visual-only light/dark styling, exercised by native rendering */
  const mascotShadow =
    scheme === 'dark'
      ? { shadowColor, shadowOffset: { width: 0, height: 12 }, shadowRadius: 22, shadowOpacity: 0.55 }
      : { shadowColor, shadowOffset: { width: 0, height: 14 }, shadowRadius: 26, shadowOpacity: 0.32 };

  return (
    <Animated.View
      testID="cloud-curtain"
      pointerEvents="none"
      style={styles.host}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.curtain, curtainStyle]}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 400 900"
          preserveAspectRatio="none"
          style={styles.svg}
        >
          <Defs>
            {/* Ciel — plus chaud vers l'horizon (l.55-58) */}
            <LinearGradient id="cbCurtainSky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.curtainSky} />
              <Stop offset="1" stopColor={colors.curtain1} />
            </LinearGradient>
            {/* Corps nuageux — pâle près de la vague, plus sombre dessous (l.60-63) */}
            <LinearGradient id="cbCurtainCloud" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.curtain1} />
              <Stop offset="1" stopColor={colors.curtain2} />
            </LinearGradient>
          </Defs>

          {/* Ciel plein cadre — masque l'écran pendant le HOLD */}
          <Rect x="0" y="0" width="400" height="900" fill="url(#cbCurtainSky)" />

          {/* Crêtes — percent la ligne de nuages */}
          <Path d={MOUNTAINS} fill={colors.curtainPeak} opacity={0.92} />

          {/* Bande lointaine — profondeur (op .55) */}
          <Path d={DISTANT_BAND} fill={colors.curtain2} opacity={0.55} />

          {/* Vague arrière — crête plus haute */}
          <Path d={BACK_WAVE} fill={colors.curtain2} />

          {/* Vague avant — corps principal, dégradé */}
          <Path d={FRONT_WAVE} fill="url(#cbCurtainCloud)" />

          {/* Bosses de profondeur dans la mer (op .35 / .22) */}
          <Path d={DEPTH_BUMP_1} fill={colors.curtain2} opacity={0.35} />
          <Path d={DEPTH_BUMP_2} fill={colors.curtain2} opacity={0.22} />

          {/* Trois petites bouffées de crête (op .95) */}
          <Ellipse cx="92" cy="386" rx="20" ry="7" fill={colors.curtain1} opacity={0.95} />
          <Ellipse cx="226" cy="404" rx="22" ry="8" fill={colors.curtain1} opacity={0.95} />
          <Ellipse cx="330" cy="378" rx="18" ry="6" fill={colors.curtain1} opacity={0.95} />
        </Svg>

        {/* Mascotte — wrapper = chemin (translate/scale/opacity),
            Image interne = float continu (translateY/rotate) + ombre. */}
        <Animated.View style={[styles.mascotWrap, pathStyle]}>
          <Animated.Image
            testID="cloud-curtain-mascot"
            source={mascotSrc}
            accessibilityIgnoresInvertColors
            style={[styles.mascotImg, mascotShadow, floatStyle]}
          />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    overflow: 'hidden',
  },
  curtain: {
    ...StyleSheet.absoluteFillObject,
  },
  svg: {
    flex: 1,
  },
  mascotWrap: {
    position: 'absolute',
    top: '34%', // prototype `.cb-curtain-mascot` l.516
    left: 0,
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
  },
  mascotImg: {
    width: '100%',
    height: '100%',
  },
});
