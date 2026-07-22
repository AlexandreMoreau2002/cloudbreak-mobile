/**
 * NotificationsSlide — troisième et dernier écran de l'onboarding narratif (prototype `CBOnb3`).
 *
 * Structure :
 *  - sur-titre + titre + corps (même échelle typographique que `WelcomeSlide`/`SummitSlide`)
 *  - deux cartes de preview de notification (purement illustratives, non interactives) :
 *    la première pleine opacité avec titre, la seconde à 70% d'opacité sans titre
 *  - dock bas : `MascotBreadcrumb active={2}` + CTA « Autoriser » + CTA ghost « Plus tard »
 *
 * Comportement (AC 3 — zéro friction) : l'appel natif à `Notifications.requestPermissionsAsync`
 * vit dans `useNotificationPermission`, jamais ici. Que la permission soit accordée, refusée,
 * ou que l'appel échoue, `onFinish` est TOUJOURS appelé — l'onboarding ne bloque jamais sur
 * ce choix. Le bouton « Plus tard » ne demande même pas la permission : il termine directement.
 */
import i18n from '@/utils/i18n';
import { useEffect, useRef } from 'react';
import { track } from '@/services/analytics';
import { useTheme } from '@/contexts/ThemeContext';
import { StyleSheet, Text, View } from 'react-native';
import { OnboardingCta } from '@/components/onboarding/cta';
import { MascotBreadcrumb } from '@/components/onboarding/mascot-breadcrumb';
import { useNotificationPermission } from '@/hooks/onboarding/useNotificationPermission';

export interface NotificationsSlideProps {
  onFinish: () => void;
}

export function NotificationsSlide({ onFinish }: NotificationsSlideProps) {
  const { colors, typography } = useTheme();
  const pendingRef = useRef(false);
  const { requestPermission } = useNotificationPermission();

  useEffect(() => {
    track('onboarding_step_viewed', { step: 3 });
  }, []);

  async function handleAllow() {
    // Garde anti double-tap : la demande native est asynchrone, un second
    // press pendant l'await relancerait la permission et onFinish.
    if (pendingRef.current) return;
    pendingRef.current = true;
    const granted = await requestPermission();
    track('onboarding_permission_result', { granted });
    onFinish();
  }

  function handleSkip() {
    // Même garde : un double-press enverrait l'event analytics deux fois.
    if (pendingRef.current) return;
    pendingRef.current = true;
    track('onboarding_permission_result', { granted: false });
    onFinish();
  }

  return (
    <View style={styles.root}>
      <Text
        style={[styles.eyebrow, { color: colors.textDisabled, fontFamily: typography.fontFamily.semiBold }]}
      >
        {i18n.t('onboarding.step3Eyebrow')}
      </Text>

      <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.light }]}>
        {i18n.t('onboarding.step3Title')}
      </Text>

      <Text style={[styles.body, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {i18n.t('onboarding.step3Body')}
      </Text>

      <View
        style={[
          styles.card,
          styles.cardPrimary,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text
            style={[
              styles.cardApp,
              { color: colors.textSecondary, fontFamily: typography.fontFamily.bold },
            ]}
          >
            {i18n.t('onboarding.notifPreviewApp')}
          </Text>
          <Text style={[styles.cardTime, { color: colors.textDisabled }]}>
            {i18n.t('onboarding.notifPreviewTime1')}
          </Text>
        </View>
        <Text
          style={[
            styles.cardTitle,
            { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold },
          ]}
        >
          {i18n.t('onboarding.notifPreviewTitle1')}
        </Text>
        <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
          {i18n.t('onboarding.notifPreviewBody1')}
        </Text>
      </View>

      <View
        style={[
          styles.card,
          styles.cardSecondary,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text
            style={[
              styles.cardApp,
              { color: colors.textSecondary, fontFamily: typography.fontFamily.bold },
            ]}
          >
            {i18n.t('onboarding.notifPreviewApp')}
          </Text>
          <Text style={[styles.cardTime, { color: colors.textDisabled }]}>
            {i18n.t('onboarding.notifPreviewTime2')}
          </Text>
        </View>
        <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
          {i18n.t('onboarding.notifPreviewBody2')}
        </Text>
      </View>

      <View style={styles.spacer} />

      <View style={styles.dock}>
        <MascotBreadcrumb active={2} total={4} />
        <View style={styles.dockSpacer} />
        <OnboardingCta
          label={i18n.t('onboarding.allowNotifications')}
          onPress={handleAllow}
          testID="notif-allow"
        />
        <View style={styles.dockSpacer} />
        <OnboardingCta
          label={i18n.t('onboarding.skip')}
          onPress={handleSkip}
          variant="ghost"
          testID="notif-skip"
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
  cardPrimary: {
    marginBottom: 12,
  },
  cardSecondary: {
    marginHorizontal: 16,
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardApp: {
    fontSize: 11,
    letterSpacing: 1.5,
  },
  cardTime: {
    fontSize: 11,
    marginLeft: 'auto',
  },
  cardTitle: {
    fontSize: 14,
  },
  cardBody: {
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
