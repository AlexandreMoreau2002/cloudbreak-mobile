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
import { CloudLayerViz } from '@/components/CloudLayerViz';
import type { ScoreResponse } from '@/services/mockData/types';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const HOUR_OPTIONS = [6, 8, 10, 12, 14, 16];

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

function getVerdictLabel(verdict: ScoreResponse['verdict'], sunny: boolean): string {
  if (verdict === 'none' && sunny) return `${i18n.t('score.sunny')} ☀️`;
  const labels: Record<ScoreResponse['verdict'], string> = {
    none: `${i18n.t('score.none')} ⚫`,
    high: `${i18n.t('score.high')} 🟢`,
    medium: `${i18n.t('score.medium')} 🟡`,
    low: `${i18n.t('score.low')} 🔴`,
  };
  return labels[verdict];
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function ScoreCard({
  score,
  date,
  contextMessage,
  selectedHour,
  onSelectHour,
}: ScoreCardProps) {
  const { scheme } = useTheme();
  const isDark = scheme === 'dark';
  const isSunny = score.verdict === 'none' && score.cloud_base > score.peak_altitude;
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
  const cardText = isDark ? Colors.dark.textPrimary : Colors.light.textPrimary;
  const cardTextDim = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
  const cardShadow = isDark ? '#000000' : '#A07D5D';
  const chipBg = isDark ? '#FFFFFF0D' : '#FFFFFFB5';
  const chipBorder = isDark ? '#FFFFFF14' : '#DCCEBB';
  const contextBg = isDark ? '#FFFFFF0D' : '#FFFFFFB8';
  const contextBorder = isDark ? '#FFFFFF12' : '#E3D5C5';

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
          <View style={styles.peakRow}>
            <Text style={[styles.peakName, { color: cardText }]} numberOfLines={1}>
              {score.peak_name}
            </Text>
            <Text style={[styles.peakAlt, { color: cardTextDim }]}>
              {score.peak_altitude} m
            </Text>
          </View>

          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNumber, { color: verdictColor }]}>
              {score.score}
            </Text>
            <Text style={[styles.scorePercent, { color: verdictColor }]}>%</Text>
          </View>

          <View style={[styles.pill, { backgroundColor: pillBg }]}>
            <Text style={[styles.pillText, { color: verdictColor }]}>
              {getVerdictLabel(score.verdict, isSunny)}
            </Text>
          </View>
        </View>

        <View style={styles.vizWrapper}>
          <CloudLayerViz viz={viz} compact isSunny={isSunny} tone={isDark ? 'dark' : 'light'} />
        </View>
      </View>

      {onSelectHour ? (
        <View style={styles.hourRow}>
          {HOUR_OPTIONS.map((h) => {
            const isActive = h === selectedHour;
            return (
              <TouchableOpacity
                key={h}
                onPress={() => onSelectHour(h)}
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
        </View>
      ) : null}

      <View style={styles.footerBlock}>
        <Text style={[styles.dateText, { color: cardTextDim }]}>
          {formatDate(date)}
        </Text>

        {hasContextMessage ? (
          <View style={[styles.contextMessageBox, { backgroundColor: contextBg, borderColor: contextBorder }]}>
            <Text style={[styles.contextMessageText, { color: cardText }]}>
              {contextMessage}
            </Text>
          </View>
        ) : null}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    gap: Spacing.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 12 },
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.md,
  },
  heroColumn: {
    flex: 1,
    gap: Spacing.md,
  },
  vizWrapper: {
    width: 126,
  },
  peakRow: {
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  peakName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
  },
  peakAlt: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  scoreNumber: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.hero,
    lineHeight: Typography.fontSize.hero * Typography.lineHeight.tight,
  },
  scorePercent: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xl,
    paddingBottom: 14,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  pillText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  hourChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  hourChipText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
  },
  footerBlock: {
    gap: Spacing.md,
  },
  dateText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    textTransform: 'capitalize',
  },
  contextMessageBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  contextMessageText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    lineHeight: Math.round(Typography.fontSize.sm * 1.45),
  },
});
