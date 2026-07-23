/**
 * LocationSlide — quatrième et dernier écran de l'onboarding narratif (prototype CBOnb4).
 *
 * Clone structurel de NotificationsSlide : même échelle typographique, même dock
 * (MascotBreadcrumb + CTA plein + CTA ghost). Comportement zéro friction (AC 2) :
 * que la permission soit accordée, refusée, ou que l'appel échoue, `onFinish` est
 * TOUJOURS appelé — l'onboarding ne bloque jamais sur ce choix.
 */
import i18n from '@/utils/i18n';
import Svg, { Path } from 'react-native-svg';
import { useEffect, useRef } from 'react';
import { track } from '@/services/analytics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { StyleSheet, Text, View } from 'react-native';
import { OnboardingCta } from '@/components/onboarding/cta';
import { MascotBreadcrumb } from '@/components/onboarding/mascot-breadcrumb';
import { useLocationPermission } from '@/hooks/onboarding/useLocationPermission';

const BACK_PEAK = 'M0 160 L120 40 L260 160 Z';
const FRONT_PEAK = 'M90 160 L260 20 L400 160 Z';

export interface LocationSlideProps {
  onFinish: () => void;
}

export function LocationSlide({ onFinish }: LocationSlideProps) {
  const { colors, typography } = useTheme();
  const pendingRef = useRef(false);
  const { requestPermission } = useLocationPermission();

  useEffect(() => {
    track('onboarding_step_viewed', { step: 4 });
  }, []);

  async function handleAllow() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    const granted = await requestPermission();
    track('onboarding_permission_result', { type: 'location', granted });
    onFinish();
  }

  function handleSkip() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    track('onboarding_permission_result', { type: 'location', granted: false });
    onFinish();
  }

  return (
    <View style={styles.root}>
      <Text
        style={[styles.eyebrow, { color: colors.textDisabled, fontFamily: typography.fontFamily.semiBold }]}
      >
        {i18n.t('onboarding.step4Eyebrow')}
      </Text>

      <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.light }]}>
        {i18n.t('onboarding.step4Title')}
      </Text>

      <Text style={[styles.body, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {i18n.t('onboarding.step4Body')}
      </Text>

      <View
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.mountainsWrap}>
          <View style={styles.mountains}>
            <Svg width="100%" height="100%" viewBox="0 0 400 160" preserveAspectRatio="none">
              <Path d={BACK_PEAK} fill={colors.accentSecondary} />
              <Path d={FRONT_PEAK} fill={colors.accent} />
            </Svg>
          </View>
          <View style={styles.pinBadge}>
            <Ionicons name="location" size={18} color={colors.accent} />
          </View>
        </View>
        <View style={styles.captionRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.caption, { color: colors.textSecondary }]}>
            {i18n.t('onboarding.locationPreviewCaption')}
          </Text>
        </View>
      </View>

      <View style={styles.spacer} />

      <View style={styles.dock}>
        <MascotBreadcrumb active={3} total={4} />
        <View style={styles.dockSpacer} />
        <OnboardingCta
          label={i18n.t('onboarding.allowLocation')}
          onPress={handleAllow}
          testID="location-allow"
        />
        <View style={styles.dockSpacer} />
        <OnboardingCta
          label={i18n.t('onboarding.skip')}
          onPress={handleSkip}
          variant="ghost"
          testID="location-skip"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    lineHeight: 31,
    letterSpacing: -0.56,
    marginBottom: 14,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 32,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    shadowOpacity: 0.1,
  },
  mountainsWrap: {
    height: 160,
  },
  mountains: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pinBadge: {
    position: 'absolute',
    top: -1,
    left: '65%',
    transform: [{ translateX: -9 }],
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  caption: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  spacer: {
    flex: 1,
  },
  dock: {
    flexShrink: 0,
  },
  dockSpacer: {
    height: 8,
  },
});
