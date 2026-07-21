/**
 * OnboardingCta — bouton d'action de l'onboarding (prototype `.cb-cta`).
 *
 * Deux variantes :
 *  - `primary` : pleine, haute 52px, fond encre (inverse du thème), texte clair,
 *    label en capitales espacées (Josefin 600, 11px, letterSpacing 2), rayon 10.
 *  - `ghost` : transparente, haute 44px, bordure 1px, texte encre.
 *
 * État pressé (fidèle `.cb-cta:active`) : translateY 1px + léger assombrissement.
 * `showArrow` ajoute une flèche → (react-native-svg) après le label.
 *
 * Note tokens : le thème n'expose pas de token `cta` dédié. On reconstitue le
 * couple encre/inverse du prototype (`--cb-cta` / `--cb-cta-ink`) à partir des
 * tokens existants — fond = `textPrimary`, encre = `surface` (light) /
 * `background` (dark) — ce qui reproduit exactement #1A1A1A/#F7F5F1 (light) et
 * #F7F5F1/#1A1A1A (dark).
 */
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';
import { type ThemeColors } from '@/constants/colors';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

export type OnboardingCtaVariant = 'primary' | 'ghost';

export interface OnboardingCtaProps {
  label: string;
  onPress: () => void;
  variant?: OnboardingCtaVariant;
  showArrow?: boolean;
  testID?: string;
}

function ArrowRight({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12h14M13 5l7 7-7 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Construit la pile de styles du conteneur (pure — testable directement).
 * Reproduit `.cb-cta` / `.cb-cta-ghost` + l'état `:active` (translateY 1 + dim).
 */
export function buildContainerStyle(
  pressed: boolean,
  isGhost: boolean,
  colors: ThemeColors,
): StyleProp<ViewStyle> {
  return [
    styles.base,
    isGhost
      ? { height: 44, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }
      : { height: 52, backgroundColor: colors.textPrimary },
    pressed && styles.pressed,
  ];
}

export function OnboardingCta({
  label,
  onPress,
  variant = 'primary',
  showArrow = false,
  testID,
}: OnboardingCtaProps) {
  const { colors, scheme, typography } = useTheme();

  const isGhost = variant === 'ghost';
  const inkColor = scheme === 'dark' ? colors.background : colors.surface;
  const textColor = isGhost ? colors.textPrimary : inkColor;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => buildContainerStyle(pressed, isGhost, colors)}
    >
      <View style={styles.content}>
        <Text
          style={[
            styles.label,
            { color: textColor, fontFamily: typography.fontFamily.semiBold },
          ]}
        >
          {label}
        </Text>
        {showArrow && <ArrowRight color={textColor} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.92,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
