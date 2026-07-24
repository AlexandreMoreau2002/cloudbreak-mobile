/**
 * ValidationBottomSheet — story 6.1, validation terrain d'une prédiction.
 *
 * Mêmes patterns d'animation que PaywallScreen (Modal + Animated, pas de
 * librairie externe). Un seul composant, contenu conditionné par `step`.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import i18n from '@/utils/i18n';
import { Colors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { LoadingSpinner } from '@/components/loading-spinner';

type TerrainStep = 'searching' | 'ready' | 'denied' | 'success' | null;

interface ValidationBottomSheetProps {
  visible: boolean;
  step: TerrainStep;
  noGps: boolean;
  peakName: string;
  score: number;
  verdict: 'none' | 'high' | 'medium' | 'low';
  onAnswer: (result: boolean) => void;
  onValidateManually: () => void;
  onDismiss: () => void;
}

export function ValidationBottomSheet({
  visible,
  step,
  noGps,
  peakName,
  score,
  verdict,
  onAnswer,
  onValidateManually,
  onDismiss,
}: ValidationBottomSheetProps) {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible && step) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(600);
    }
  }, [visible, step, overlayOpacity, sheetTranslateY]);

  if (!step) return null;

  const sheetBg = isDark ? Colors.dark.surface : Colors.light.surface;
  const accentSoftBg = colors.accent + '1F';

  function renderContent() {
    switch (step) {
      case 'searching':
        return (
          <View testID="terrain-searching" style={styles.centered}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>{i18n.t('terrain.searchingTitle')}</Text>
            <LoadingSpinner size="small" style={styles.spinner} />
            <Text style={[styles.body, { color: colors.textSecondary }]}>{i18n.t('terrain.searchingBody')}</Text>
          </View>
        );
      case 'ready':
        return (
          <View>
            {!noGps ? (
              <View testID="terrain-gps-pill" style={[styles.gpsPill, { backgroundColor: accentSoftBg }]}>
                <Text style={[styles.gpsPillText, { color: colors.accent }]}>
                  {i18n.t('terrain.gpsConfirmed', { peak: peakName })}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.forecastRecall, { color: colors.textSecondary }]}>
              {i18n.t('terrain.forecastRecall', { score, verdict: i18n.t(`score.label.${verdict}`), peak: peakName })}
            </Text>
            <Text style={[styles.question, { color: colors.textPrimary }]}>{i18n.t('terrain.question')}</Text>
            <View style={styles.answerRow}>
              <Pressable
                testID="terrain-answer-no"
                style={[styles.answerButtonOutline, { borderColor: colors.border }]}
                onPress={() => onAnswer(false)}
              >
                <Text style={[styles.answerButtonOutlineText, { color: colors.textPrimary }]}>
                  {i18n.t('terrain.answerNo')}
                </Text>
              </Pressable>
              <Pressable
                testID="terrain-answer-yes"
                style={[styles.answerButtonFilled, { backgroundColor: colors.accent }]}
                onPress={() => onAnswer(true)}
              >
                <Text style={styles.answerButtonFilledText}>{i18n.t('terrain.answerYes')}</Text>
              </Pressable>
            </View>
            <Pressable testID="terrain-later" onPress={onDismiss} style={styles.laterLink}>
              <Text style={[styles.laterText, { color: colors.textSecondary }]}>{i18n.t('terrain.later')}</Text>
            </Pressable>
          </View>
        );
      case 'denied':
        return (
          <View>
            <View testID="terrain-gps-pill-denied" style={[styles.gpsPill, { backgroundColor: colors.border }]}>
              <Text style={[styles.gpsPillText, { color: colors.textSecondary }]}>{i18n.t('terrain.gpsUnavailable')}</Text>
            </View>
            <Text style={[styles.question, { color: colors.textPrimary }]}>{i18n.t('terrain.deniedTitle')}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{i18n.t('terrain.deniedBody')}</Text>
            <Pressable
              testID="terrain-validate-manually"
              style={[styles.ctaAccent, { backgroundColor: colors.accent }]}
              onPress={onValidateManually}
            >
              <Text style={styles.ctaAccentText}>{i18n.t('terrain.validateManually')}</Text>
            </Pressable>
            <Pressable testID="terrain-later" onPress={onDismiss} style={styles.laterLink}>
              <Text style={[styles.laterText, { color: colors.textSecondary }]}>{i18n.t('terrain.later')}</Text>
            </Pressable>
          </View>
        );
      case 'success':
        return (
          <View style={styles.centered}>
            <View style={[styles.successBadge, { backgroundColor: Colors.score.high + '29' }]}>
              <Text style={[styles.successBadgeIcon, { color: Colors.score.high }]}>✓</Text>
            </View>
            <Text style={[styles.question, { color: colors.textPrimary }]}>{i18n.t('terrain.successTitle')}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{i18n.t('terrain.successBody')}</Text>
            <Pressable testID="terrain-close" style={[styles.ctaAccent, { backgroundColor: colors.accent }]} onPress={onDismiss}>
              <Text style={styles.ctaAccentText}>{i18n.t('terrain.close')}</Text>
            </Pressable>
          </View>
        );
      default:
        return null;
    }
  }

  return (
    <Modal testID="terrain-modal" visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={onDismiss}>
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,16,12,0.35)', opacity: overlayOpacity }]} pointerEvents="none" />
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} testID="terrain-overlay" />
        <Animated.View
          testID="terrain-sheet"
          style={[styles.sheet, { backgroundColor: sheetBg, transform: [{ translateY: sheetTranslateY }] }]}
        >
          <View style={[styles.handle, { backgroundColor: 'rgba(26,26,26,0.18)' }]} />
          {renderContent()}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  centered: { alignItems: 'center', paddingVertical: Spacing.lg },
  spinner: { marginVertical: Spacing.sm },
  eyebrow: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.fontSize.xs },
  body: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, textAlign: 'center' },
  gpsPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  gpsPillText: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.fontSize.xs },
  forecastRecall: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, marginBottom: Spacing.sm },
  question: { fontFamily: Typography.fontFamily.bold, fontSize: 24, marginBottom: Spacing.md },
  answerRow: { flexDirection: 'row', gap: Spacing.sm },
  answerButtonOutline: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerButtonOutlineText: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.fontSize.sm },
  answerButtonFilled: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerButtonFilledText: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.sm, color: '#FFFFFF' },
  laterLink: { alignSelf: 'center', marginTop: Spacing.md },
  laterText: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm },
  ctaAccent: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  ctaAccentText: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.sm, color: '#FFFFFF' },
  successBadge: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successBadgeIcon: { fontSize: 26, fontFamily: Typography.fontFamily.bold },
});
