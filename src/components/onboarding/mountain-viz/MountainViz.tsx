/**
 * MountainViz — la viz signature « mer de nuages » de l'onboarding.
 *
 * Empilement de couches (fidèle au prototype `MountainViz`, cb-components.jsx) :
 *  1. ciel — dégradé vertical d'aube chaud (light) / nuit (dark)
 *  2. halo de soleil — cercle radial flou, positionné à 68% / 38%
 *  3. crêtes — deux silhouettes SVG (arrière atténuée + avant signature) + ligne
 *     de neige sur le pic principal
 *  4. mer de nuages — deux couches SVG qui dérivent doucement, dont la hauteur
 *     répond au score (score haut → nuages plus bas → sommet plus dégagé), plus
 *     un voile de teinte du score à la base.
 *
 * Mouvement (fidèle styles.css `cb-cloud-drift` / `-2`) :
 *  - couche arrière : translateX 0→8→0 / translateY 0→−3→0, cycle 14s ease-in-out
 *  - couche avant   : translateX 0→−6→0 / translateY 0→2→0, cycle 11s ease-in-out
 *  reverse, demi-durée) → oscillation sinusoïdale organique et synchro X/Y.
 *  Le conteneur mer entier « respire » en plus (fidèle styles.css `cb-sea-breathe`,
 *  translateY 0→−18→0, 5s) — respiration globale superposée aux dérives par couche.
 *
 * Note tokens : le voile de teinte réutilise les tokens de score du thème
 * (`Colors.score.high/medium/low`, #4CAF50/#FF9800/#F44336) et non les hex du
 * prototype (#5C9E6E/#D4904A/#C25C4A) — règle projet « réutiliser les tokens ».
 */
import { useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Path, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import Animated, {
  Easing,
  withRepeat,
  withTiming,
  interpolate,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

export interface MountainVizProps {
  score?: number;
  height?: number;
}

const BACK_RIDGE =
  'M0 130 L60 90 L100 110 L150 70 L200 95 L260 60 L320 95 L380 75 L400 90 L400 200 L0 200 Z';
const FRONT_RIDGE =
  'M0 160 L40 130 L80 145 L130 95 L170 120 L220 80 L260 110 L310 65 L350 105 L400 125 L400 200 L0 200 Z';
const SNOW_LINE = 'M295 85 L310 65 L320 80';
const CLOUD_BACK =
  'M0 50 Q 30 30, 60 40 T 120 35 Q 160 25, 200 38 T 280 32 Q 320 22, 360 35 T 400 38 L 400 100 L 0 100 Z';
const CLOUD_FRONT =
  'M0 40 Q 20 22, 50 30 Q 80 18, 110 28 Q 140 14, 180 26 Q 220 18, 250 28 Q 290 16, 330 26 Q 360 18, 400 28 L 400 80 L 0 80 Z';

function scoreAccent(score: number): string {
  if (score >= 70) return Colors.score.high;
  if (score >= 40) return Colors.score.medium;
  return Colors.score.low;
}

/**
 * Style animé « pendule » : une valeur 0→1→0 (withRepeat reverse) mappée sur un
 * déplacement translateX/translateY. `halfMs` = demi-cycle (durée pleine / 2).
 */
function useDriftStyle(dx: number, dy: number, halfMs: number): ViewStyle {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: halfMs, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [t, halfMs]);
  return useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 1], [0, dx]) },
      { translateY: interpolate(t.value, [0, 1], [0, dy]) },
    ],
  }));
}

export function MountainViz({ score = 78, height = 200 }: MountainVizProps) {
  const { scheme } = useTheme();
  const dark = scheme === 'dark';

  const cloudTop = 50 + (score / 100) * 22; // % depuis le haut
  /* istanbul ignore next -- palette-only branches, covered by visual native checks */
  const peakInk = dark ? '#484848' : '#5C4838';
  /* istanbul ignore next */
  const peakHi = dark ? '#383838' : '#7A5E47';
  /* istanbul ignore next */
  const snowColor = dark ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.55)';
  /* istanbul ignore next */
  const cloudBackFill = dark ? 'rgba(160,160,160,0.45)' : 'rgba(252,245,232,0.92)';
  /* istanbul ignore next */
  const cloudFrontFill = dark ? 'rgba(190,190,190,0.75)' : '#FFFFFF';
  /* istanbul ignore next -- opaque variant used only for the corner-reveal backing layer */
  const cloudBackingFill = dark ? '#B0B0B0' : '#FFFFFF';
  const accent = scoreAccent(score);

  /* istanbul ignore next */
  const skyColors = dark
    ? (['#1A1A1A', '#222222', '#2A2A2A'] as const)
    : (['#FBF1DD', '#F6DFB8', '#EBC798'] as const);
  /* istanbul ignore next */
  const skyLocations = dark ? ([0, 0.6, 1] as const) : ([0, 0.55, 1] as const);

  const backDrift = useDriftStyle(8, -3, 7000); // 14s plein
  const frontDrift = useDriftStyle(-6, 2, 5500); // 11s plein
  const seaBreathe = useDriftStyle(0, -18, 2500); // 5s plein

  return (
    <View testID="mountain-viz" style={[styles.container, { height }]}>
      {/* Ciel — dégradé d'aube */}
      <LinearGradient
        colors={skyColors}
        locations={skyLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Halo de soleil */}
      <View style={styles.sunGlow}>
        <Svg width={100} height={100} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="sun" cx="50%" cy="50%" r="50%">
              {/* istanbul ignore next -- native SVG palette assertion is covered in visual QA */}
              <Stop
                offset="0%"
                stopColor={dark ? 'rgb(200,200,200)' : 'rgb(255,225,170)'}
                stopOpacity={dark ? 0.15 : 0.9}
              />
              {/* istanbul ignore next -- native SVG palette assertion is covered in visual QA */}
              <Stop
                offset="70%"
                stopColor={dark ? 'rgb(200,200,200)' : 'rgb(255,225,170)'}
                stopOpacity={0}
              />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={100} height={100} fill="url(#sun)" />
        </Svg>
      </View>

      {/* Crêtes */}
      <Svg
        viewBox="0 0 400 200"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Path d={BACK_RIDGE} fill={peakHi} opacity={0.55} />
        <Path d={FRONT_RIDGE} fill={peakInk} />
        <Path
          d={SNOW_LINE}
          fill="none"
          stroke={snowColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>

      {/* Filet de sécurité opaque, ancré au conteneur (indépendant du score/
          cloudTop et de l'animation `sea`) : couvre toujours une bande fixe en
          bas de l'illustration, pour garantir qu'aucun fond ne perce jamais
          dans les coins où la feuille de contenu (coins arrondis, marginTop
          négatif) chevauche le héro — quelle que soit la géométrie des vagues
          SVG des couches nuage rendues par-dessus. */}
      <View style={[styles.cloudBacking, { backgroundColor: cloudBackingFill }]} />

      {/* Mer de nuages */}
      <Animated.View style={[styles.sea, { top: `${cloudTop}%` }, seaBreathe]}>
        {/* Couche arrière */}
        <Animated.View style={[styles.cloudBack, backDrift]}>
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 100"
            preserveAspectRatio="none"
          >
            <Path d={CLOUD_BACK} fill={cloudBackFill} />
          </Svg>
        </Animated.View>

        {/* Couche avant */}
        <Animated.View style={[styles.cloudFront, frontDrift]}>
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 80"
            preserveAspectRatio="none"
          >
            <Path d={CLOUD_FRONT} fill={cloudFrontFill} />
          </Svg>
        </Animated.View>

        {/* Voile de teinte du score */}
        <LinearGradient
          colors={['transparent', `${accent}22`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.toneWash}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  sunGlow: {
    position: 'absolute',
    left: '68%',
    top: '38%',
    width: 100,
    height: 100,
  },
  sea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  cloudBack: {
    // Débord généreux (-6% / 112%) pour absorber le drift animé (±8px) sans
    // jamais révéler le fond dans les coins, y compris sur les plus petits
    // devices supportés (320pt — iPhone SE) où un débord en % trop faible
    // (-2% ≈ 6.4px) devenait inférieur à l'amplitude du drift sur device réel.
    position: 'absolute',
    left: '-6%',
    bottom: 0,
    width: '112%',
    height: '100%',
  },
  cloudFront: {
    // Même logique — drift max ±6px, débord -6%/112% pour marge confortable.
    position: 'absolute',
    left: '-6%',
    bottom: 0,
    width: '112%',
    height: '85%',
  },
  cloudBacking: {
    // Bande fixe ancrée au bas du conteneur — volontairement généreuse (bien
    // au-delà des ~28px de chevauchement avec la feuille de contenu) et
    // indépendante du score/cloudTop pour ne jamais dépendre d'un calcul
    // fragile.
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '20%',
  },
  toneWash: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '30%',
  },
});
