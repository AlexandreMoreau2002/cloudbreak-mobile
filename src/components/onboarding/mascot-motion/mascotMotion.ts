/**
 * mascotMotion — plomberie d'animation partagée de la mascotte (story 7.1).
 *
 * Mutualise ce qui est commun à MascotBreadcrumb, SplashView et (à venir)
 * CloudCurtain (B14) :
 *  - `CURVE` : la courbe signature bezier(.22,.61,.36,1)
 *  - `getMascotAssets(scheme, accent)` : PNG + couleur d'ombre selon le thème
 *  - `useMascotBob(options)` : la boucle de flottement (bob idle), paramétrable
 *    en amplitude / rotation / durée / easing / délai
 *  - `bobTranslateY` / `bobRotateDeg` : worklets scalaires pour composer le bob
 *    avec d'autres transforms (pop, translateX…) dans un SEUL entry `transform`
 *
 * Défauts = bob des écrans onboarding (3px, 1°, 2.6s ease-in-out). Le curtain
 * (B14) réutilise la même boucle avec ses propres paramètres (±5px, ±1.5°,
 * 3.2s linéaire) via les options.
 */
import { useEffect } from 'react';
import { type ColorScheme } from '@/constants/colors';
import mascotDark from '@/assets/images/brand/mascot-full-dark-cut.png';
import mascotLight from '@/assets/images/brand/mascot-full-light-cut.png';
import {
  Easing,
  withDelay,
  withTiming,
  withRepeat,
  interpolate,
  useSharedValue,
  type SharedValue,
  type WithTimingConfig,
} from 'react-native-reanimated';

/** Courbe signature du prototype (cubic-bezier .22/.61/.36/1). */
export const CURVE = Easing.bezier(0.22, 0.61, 0.36, 1);

type EasingParam = NonNullable<WithTimingConfig['easing']>;

export interface MascotAssets {
  src: number;
  shadowColor: string;
}

/**
 * Sélectionne le PNG de la mascotte et la couleur d'ombre selon le thème.
 * L'opacité / offset / rayon de l'ombre restent propres à chaque écran
 * (le breadcrumb et le splash n'ont pas la même profondeur d'ombre).
 */
export function getMascotAssets(scheme: ColorScheme, accent: string): MascotAssets {
  return {
    src: scheme === 'dark' ? mascotDark : mascotLight,
    shadowColor: scheme === 'dark' ? '#000000' : accent,
  };
}

export interface BobOptions {
  /** Amplitude verticale en px (défaut 3). Renvoyée pour l'interpolation. */
  amplitude?: number;
  /** Amplitude de rotation en degrés (défaut 1). Renvoyée pour l'interpolation. */
  rotation?: number;
  /** Durée d'un cycle complet aller-retour en ms (défaut 2600). */
  durationMs?: number;
  /** Easing d'une demi-oscillation (défaut ease-in-out). */
  easing?: EasingParam;
  /** Délai avant le démarrage de la boucle en ms (défaut 0). */
  delayMs?: number;
}

export interface MascotBob {
  /** Oscillateur ping-pong 0↔1 piloté sur le thread UI. */
  bob: SharedValue<number>;
  amplitude: number;
  rotation: number;
}

/**
 * Démarre une boucle de flottement (bob) infinie et renvoie l'oscillateur.
 * Ping-pong 0↔1 : une demi-oscillation = `durationMs / 2`, aller-retour =
 * `durationMs`. Composer avec `bobTranslateY` / `bobRotateDeg`.
 */
export function useMascotBob(options: BobOptions = {}): MascotBob {
  const {
    amplitude = 3,
    rotation = 1,
    durationMs = 2600,
    easing = Easing.inOut(Easing.ease),
    delayMs = 0,
  } = options;

  const bob = useSharedValue(0);

  useEffect(() => {
    const loop = withRepeat(withTiming(1, { duration: durationMs / 2, easing }), -1, true);
    bob.value = delayMs > 0 ? withDelay(delayMs, loop) : loop;
  }, [bob, durationMs, easing, delayMs]);

  return { bob, amplitude, rotation };
}

/** translateY du bob : au repos à 0, plonge jusqu'à `-amplitude`. Worklet. */
export function bobTranslateY(bob: number, amplitude: number): number {
  'worklet';
  return interpolate(bob, [0, 1], [0, -amplitude]);
}

/** rotation du bob : oscille de `-rotation` à `+rotation` degrés. Worklet. */
export function bobRotateDeg(bob: number, rotation: number): number {
  'worklet';
  return interpolate(bob, [0, 1], [-rotation, rotation]);
}
