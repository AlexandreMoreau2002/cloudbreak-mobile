/**
 * ScoreDetails — panneau detaille des conditions associees au score affiche.
 *
 * Ce composant sert de seconde lecture sous la ScoreCard :
 * - resume de la fenetre optimale et du lever du soleil
 * - conditions clefs (base nuageuse, humidite, vent, inversion)
 * - niveau de stabilite de la situation
 * - visualisation detaillee si `cloud_layer_viz` est disponible
 *
 * Props :
 *   score   ScoreResponse — reponse score complete a afficher
 */
import i18n from '@/utils/i18n';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { CloudLayerViz } from '@/components/cloud-layer-viz';
import { ConditionBadge } from '@/components/condition-badge';
import type { ScoreResponse } from '@/services/mockData/types';

const { background: CARD_BG, textPrimary: CARD_TEXT, textSecondary: CARD_TEXT_DIM } = Colors.dark;

interface ScoreDetailsProps {
  score: ScoreResponse;
}

function formatHumidity(score: ScoreResponse): string {
  const humidity = score.conditions.humidity ?? score.conditions.humidity_pct;
  return humidity != null ? `${Math.round(humidity)}%` : 'N/A';
}

function formatWind(score: ScoreResponse): string {
  const wind = score.conditions.wind_speed ?? score.conditions.wind_speed_kmh;
  return wind != null ? `${Math.round(wind)} km/h` : 'N/A';
}

function formatInversion(score: ScoreResponse): string {
  const present = score.conditions.inversion_present ?? score.conditions.inversion_detected;
  if (present == null) return 'N/A';
  return present ? 'Oui' : 'Non';
}

function getStabilityMessage(stabilityHours: number | null | undefined): string {
  if (stabilityHours == null) return i18n.t('home.stabilityUnknown');
  if (stabilityHours >= 36) return i18n.t('home.stabilityStrong', { hours: stabilityHours });
  if (stabilityHours < 12) return i18n.t('home.stabilityWeak');
  return i18n.t('home.stabilityMedium', { hours: stabilityHours });
}

function getStabilityColor(stabilityHours: number | null | undefined): string {
  if (stabilityHours == null) return CARD_TEXT;
  if (stabilityHours >= 36) return Colors.score.high;
  if (stabilityHours < 12) return Colors.score.medium;
  return CARD_TEXT;
}

export function ScoreDetails({ score }: ScoreDetailsProps) {
  useLanguage();
  const windowText = score.optimal_window_start && score.optimal_window_end
    ? `${score.optimal_window_start}-${score.optimal_window_end}`
    : i18n.t('home.windowUnavailable');

  return (
    <View style={styles.container} testID="score-details">
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{i18n.t('home.optimalWindow')}</Text>
          <Text style={styles.summaryValue}>{windowText}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{i18n.t('home.sunrise')}</Text>
          <Text style={styles.summaryValue}>{score.sunrise ?? i18n.t('home.windowUnavailable')}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{i18n.t('home.conditionsTitle')}</Text>
      <View style={styles.badgesGrid}>
        <ConditionBadge label={i18n.t('home.cloudBase')} value={`${score.cloud_base} m`} />
        <ConditionBadge label={i18n.t('home.humidity')} value={formatHumidity(score)} />
        <ConditionBadge label={i18n.t('home.wind')} value={formatWind(score)} />
        <ConditionBadge label={i18n.t('home.inversion')} value={formatInversion(score)} />
      </View>

      <View style={styles.stabilityCard}>
        <Text style={styles.stabilityTitle}>{i18n.t('home.stabilityTitle')}</Text>
        <Text style={[styles.stabilityText, { color: getStabilityColor(score.stability_hours) }]}>
          {getStabilityMessage(score.stability_hours)}
        </Text>
      </View>

      {score.cloud_layer_viz ? <CloudLayerViz viz={score.cloud_layer_viz} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
    backgroundColor: CARD_BG,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF0D',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  summaryLabel: {
    color: CARD_TEXT_DIM,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    flexShrink: 1,
  },
  summaryValue: {
    color: CARD_TEXT,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    textAlign: 'right',
    flexShrink: 0,
  },
  sectionTitle: {
    color: CARD_TEXT,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  stabilityCard: {
    backgroundColor: '#FFFFFF0D',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  stabilityTitle: {
    color: CARD_TEXT_DIM,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  stabilityText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
  },
});
