/**
 * WelcomeSlide — premier écran de l'onboarding narratif (prototype `CBOnb1`).
 *
 * Structure :
 *  - héro en haut : `MountainViz` (score 78, hauteur 340) qui ne se comprime pas
 *  - feuille en dessous : coins supérieurs arrondis (28), remontée de −28 pour
 *    chevaucher le héro, fond `background`, padding 32/28/24, gap 24
 *  - contenu : sur-titre, titre (2 lignes), corps, espaceur, fil d'Ariane
 *    (`MascotBreadcrumb active=0`), puis CTA « Continuer » avec flèche.
 *
 * Tous les textes proviennent d'i18n (namespace `onboarding.step1*` + `continue`).
 */
import i18n from '@/utils/i18n';
import { useEffect } from 'react';
import { track } from '@/services/analytics';
import { useTheme } from '@/contexts/ThemeContext';
import { StyleSheet, Text, View } from 'react-native';
import { OnboardingCta } from '@/components/onboarding/cta';
import { MountainViz } from '@/components/onboarding/mountain-viz';
import { MascotBreadcrumb } from '@/components/onboarding/mascot-breadcrumb';

export interface WelcomeSlideProps {
  onContinue: () => void;
}

export function WelcomeSlide({ onContinue }: WelcomeSlideProps) {
  const { colors, typography } = useTheme();

  useEffect(() => {
    track('onboarding_step_viewed', { step: 1 });
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <MountainViz score={78} height={340} />
      </View>

      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <Text
          style={[
            styles.eyebrow,
            { color: colors.textDisabled, fontFamily: typography.fontFamily.semiBold },
          ]}
        >
          {i18n.t('onboarding.step1Eyebrow')}
        </Text>

        <Text
          style={[
            styles.title,
            { color: colors.textPrimary, fontFamily: typography.fontFamily.light },
          ]}
        >
          {i18n.t('onboarding.step1Title')}
        </Text>

        <Text
          style={[
            styles.body,
            { color: colors.textSecondary, fontFamily: typography.fontFamily.regular },
          ]}
        >
          {i18n.t('onboarding.step1Body')}
        </Text>

        <View style={styles.spacer} />

        <MascotBreadcrumb active={0} />

        <OnboardingCta
          label={i18n.t('onboarding.continue')}
          onPress={onContinue}
          showArrow
          testID="welcome-continue"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hero: {
    flexShrink: 0,
  },
  sheet: {
    flex: 1,
    marginTop: -28,
    zIndex: 2,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 32,
    paddingHorizontal: 28,
    paddingBottom: 24,
    gap: 24,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    lineHeight: 33,
    letterSpacing: -0.6,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
  },
  spacer: {
    flex: 1,
  },
});
