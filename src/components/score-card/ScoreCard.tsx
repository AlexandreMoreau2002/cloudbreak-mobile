/**
 * ScoreCard — affiche le score mer de nuage pour un sommet.
 *
 * Props :
 *   score          ScoreResponse — données du score
 *   date           string        — ISO 8601 (ex: "2026-03-23")
 *   selectedHour   number?       — heure sélectionnée (affiche les chips si fourni)
 *   onSelectHour   function?     — callback sélection d'heure (affiche les chips si fourni)
 */
import i18n from '@/utils/i18n';
import { Colors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { Typography } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { useLanguage } from '@/contexts/LanguageContext';
import { CloudLayerViz } from '@/components/cloud-layer-viz';
import type { ScoreResponse } from '@/services/mockData/types';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CloudLayerVizVariant } from '@/components/cloud-layer-viz/types';

const HOUR_OPTIONS = [6, 8, 10, 12, 14, 16, 18, 20, 22];

interface ScoreCardProps {
  score: ScoreResponse;
  date: string;
  contextMessage?: string | null;
  selectedHour?: number;
  onSelectHour?: (hour: number) => void;
}

function getScoreColor(verdict: ScoreResponse['verdict']): string {
  return Colors.score[verdict];
}

function getLabelText(score: ScoreResponse, sunny: boolean): string {
  if (score.label?.trim()) {
    return score.label.toUpperCase();
  }
  return getVerdictLabel(score.verdict, sunny);
}

function getVerdictLabel(verdict: ScoreResponse['verdict'], sunny: boolean): string {
  if (verdict === 'none' && sunny) return i18n.t('score.sunny').toUpperCase();
  const labelKey = `score.label.${verdict}`;
  const label = i18n.t(labelKey);
  if (typeof label === 'string' && label !== labelKey) {
    return label.toUpperCase();
  }

  const labels: Record<ScoreResponse['verdict'], string> = {
    none: i18n.t('score.none').toUpperCase(),
    high: i18n.t('score.high').toUpperCase(),
    medium: i18n.t('score.medium').toUpperCase(),
    low: i18n.t('score.low').toUpperCase(),
  };
  return labels[verdict];
}

function getCompactVizVariant(score: ScoreResponse): CloudLayerVizVariant {
  if (score.verdict === 'medium') return 'ridge';
  if (score.verdict === 'low') return 'minimal';
  return 'focus';
}

export function ScoreCard({
  score,
  date,
  contextMessage,
  selectedHour,
  onSelectHour,
}: ScoreCardProps) {
  useLanguage();
  const { scheme } = useTheme();
  const isDark = scheme === 'dark';
  const isSunny = score.verdict === 'none' && score.cloud_base > score.peak_altitude;
  const hideCloudInViz = score.verdict === 'none';
  const verdictColor = getScoreColor(score.verdict);
  const pillBg = verdictColor + '2E'; // ~18% opacity hex
  const hasContextMessage = Boolean(contextMessage?.trim());
  const viz = score.cloud_layer_viz ?? {
    summit_altitude: score.peak_altitude,
    cloud_base: score.cloud_base,
    pressure_levels: [],
  };
  const cardBg = isDark ? Colors.dark.surface : Colors.light.surface;
  const cardBorder = isDark ? '#FFFFFF12' : Colors.light.border;
  const cardTextDim = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
  const cardShadow = isDark ? '#000000' : '#A07D5D';
  const chipBg = isDark ? '#FFFFFF0D' : '#FFFFFFB5';
  const chipBorder = isDark ? '#FFFFFF14' : '#DCCEBB';
  const compactVizVariant = getCompactVizVariant(score);

  return (
    <View
      testID="score-card"
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: cardBorder,
          shadowColor: cardShadow,
          shadowOpacity: isDark ? 0.18 : 0.12,
          shadowRadius: isDark ? 24 : 18,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.heroColumn}>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNumber, { color: verdictColor }]}>
              {score.score}
            </Text>
            <Text style={[styles.scorePercent, { color: verdictColor }]}>%</Text>
          </View>

          <View style={[styles.pill, { backgroundColor: pillBg }]}>
            <Text style={[styles.pillText, { color: verdictColor }]}>
              {getLabelText(score, isSunny)}
            </Text>
          </View>

          {hasContextMessage ? (
            <Text style={[styles.contextMessageInline, { color: cardTextDim }]}>
              {contextMessage}
            </Text>
          ) : null}
        </View>

        <View style={styles.vizWrapper}>
          <CloudLayerViz
            viz={viz}
            compact
            variant={compactVizVariant}
            isSunny={hideCloudInViz}
            tone={isDark ? 'dark' : 'light'}
          />
        </View>
      </View>

      {onSelectHour ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourRow}>
          {HOUR_OPTIONS.map((h) => {
            const isActive = h === selectedHour;
            return (
              <TouchableOpacity
                key={h}
                onPress={() => onSelectHour?.(h)}
                style={[
                  styles.hourChip,
                  { backgroundColor: chipBg, borderColor: chipBorder },
                  isActive && { backgroundColor: verdictColor + '33', borderColor: verdictColor + '55' },
                ]}
              >
                <Text style={[styles.hourChipText, { color: cardTextDim }, isActive && { color: verdictColor }]}>
                  {String(h).padStart(2, '0')}h
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  heroColumn: {
    flex: 1,
    gap: Spacing.xs,
  },
  vizWrapper: {
    width: 108,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  scoreNumber: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 54,
    lineHeight: 54 * Typography.lineHeight.tight,
  },
  scorePercent: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.lg,
    paddingBottom: 10,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  pillText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
  },
  hourRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: 0,
  },
  hourChip: {
    width: 52,
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  hourChipText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
  },
  footerBlock: {
    gap: Spacing.xs,
  },
  dateText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    textTransform: 'capitalize',
  },
  contextMessageInline: {
    fontFamily: Typography.fontFamily.light,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: Math.round(13 * 1.5),
    marginTop: 6,
  },
});

export const __private__ = {
  getCompactVizVariant,
};
