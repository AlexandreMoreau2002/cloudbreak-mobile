/**
 * ScoreCard — affiche le score mer de nuage pour un sommet.
 *
 * Props :
 *   score   ScoreResponse — données du score
 *   date    string        — ISO 8601 (ex: "2026-03-23")
 */
import i18n from '@/utils/i18n';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { StyleSheet, Text, View } from 'react-native';
import type { ScoreResponse } from '@/services/mockData/types';

// ScoreCard always renders on a dark card — dark palette values used directly
const { background: CARD_BG, textPrimary: CARD_TEXT, textSecondary: CARD_TEXT_DIM } = Colors.dark;

interface ScoreCardProps {
  score: ScoreResponse;
  date: string;
}

function getScoreColor(verdict: ScoreResponse['verdict']): string {
  return Colors.score[verdict];
}

function getVerdictLabel(verdict: ScoreResponse['verdict']): string {
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

export function ScoreCard({ score, date }: ScoreCardProps) {
  const verdictColor = getScoreColor(score.verdict);
  const pillBg = verdictColor + '2E'; // ~18% opacity hex

  return (
    <View testID="score-card" style={styles.card}>
      {/* Sommet + altitude */}
      <View style={styles.peakRow}>
        <Text style={styles.peakName} numberOfLines={1}>
          {score.peak_name}
        </Text>
        <Text style={styles.peakAlt}>
          {score.peak_altitude} m
        </Text>
      </View>

      {/* Score hero */}
      <View style={styles.scoreRow}>
        <Text style={[styles.scoreNumber, { color: verdictColor }]}>
          {score.score}
        </Text>
        <Text style={[styles.scorePercent, { color: verdictColor }]}>%</Text>
      </View>

      {/* Pill verdict */}
      <View style={[styles.pill, { backgroundColor: pillBg }]}>
        <Text style={[styles.pillText, { color: verdictColor }]}>
          {getVerdictLabel(score.verdict)}
        </Text>
      </View>

      {/* Date */}
      <Text style={styles.dateText}>
        {formatDate(date)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  peakRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  peakName: {
    color: CARD_TEXT,
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    textAlign: 'center',
  },
  peakAlt: {
    color: CARD_TEXT_DIM,
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
    paddingBottom: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  pillText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
  },
  dateText: {
    color: CARD_TEXT_DIM,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    textTransform: 'capitalize',
  },
});
