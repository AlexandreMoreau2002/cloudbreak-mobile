/**
 * ScoreWhySheet — « Pourquoi ce score ? », 4 facteurs expliqués.
 *
 * Mécanique de sheet : `@/components/bottom-sheet`. Seuils : `@/constants/scoreFactors`.
 */
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import i18n from '@/utils/i18n';
import { Colors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { Typography } from '@/constants/typography';
import type { ScoreResponse } from '@/services/mockData/types';
import { BottomSheet } from '@/components/bottom-sheet';
import { getScoreFactors, type FactorStatus } from '@/constants/scoreFactors';

interface ScoreWhySheetProps {
  visible: boolean;
  score: ScoreResponse;
  onDismiss: () => void;
}

type FactorKey = 'inversion' | 'clouds' | 'wind' | 'humidity';
type IconName = 'thermometer-outline' | 'cloud-outline' | 'flag-outline' | 'water-outline';

const ROWS: { key: FactorKey; icon: IconName }[] = [
  { key: 'inversion', icon: 'thermometer-outline' },
  { key: 'clouds', icon: 'cloud-outline' },
  { key: 'wind', icon: 'flag-outline' },
  { key: 'humidity', icon: 'water-outline' },
];

const EMPTY_VALUE = '—';

function formatNumber(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function formatValue(key: FactorKey, factors: ReturnType<typeof getScoreFactors>): string {
  if (key === 'clouds') {
    const { cloudBase, summit } = factors.clouds;
    if (cloudBase === null || summit === null) return EMPTY_VALUE;
    return `${formatNumber(Math.round(cloudBase))} m · ${formatNumber(Math.round(summit))} m`;
  }
  const value = factors[key].value;
  if (value === null) return EMPTY_VALUE;
  if (key === 'inversion') return `${value > 0 ? '+' : ''}${formatNumber(value)} °C`;
  if (key === 'wind') return `${formatNumber(value)} km/h`;
  return `${formatNumber(value)} %`;
}

export function ScoreWhySheet({ visible, score, onDismiss }: ScoreWhySheetProps) {
  const { colors } = useTheme();

  const accentSoftBg = colors.accent + '1F';
  const factors = useMemo(() => getScoreFactors(score), [score]);

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} testIDPrefix="score-why">
      <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>{i18n.t('scoreWhy.eyebrow')}</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {i18n.t('scoreWhy.title', { score: score.score })}
      </Text>

      {ROWS.map(({ key, icon }, index) => {
        const status: FactorStatus = factors[key].status;
        const statusColor = Colors.factorStatus[status];
        const name = i18n.t(`scoreWhy.name.${key}`);
        const value = formatValue(key, factors);
        const sentence = i18n.t(`scoreWhy.${key}.${status}`);
        return (
          <View
            key={key}
            testID={`score-why-row-${key}`}
            accessible
            accessibilityLabel={i18n.t('scoreWhy.a11yRow', {
              name,
              value,
              status: i18n.t(`scoreWhy.status.${status}`),
              sentence,
            })}
            style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
          >
            <View style={[styles.iconTile, { backgroundColor: accentSoftBg }]}>
              <Ionicons name={icon} size={18} color={colors.accent} />
            </View>
            <View style={styles.rowBody}>
              <View style={styles.rowHead}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{name}</Text>
                <View style={styles.valueWrap}>
                  <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
                  <View style={[styles.dot, { backgroundColor: statusColor }]} />
                </View>
              </View>
              <Text style={[styles.sentence, { color: colors.textSecondary }]}>{sentence}</Text>
            </View>
          </View>
        );
      })}

      <View testID="score-why-caution" style={[styles.caution, { backgroundColor: accentSoftBg }]}>
        <Text style={[styles.cautionText, { color: colors.textSecondary }]}>
          <Text style={[styles.cautionBold, { color: colors.textPrimary }]}>{i18n.t('scoreWhy.cautionBold')}</Text>
          {i18n.t('scoreWhy.cautionBody')}
        </Text>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: { fontFamily: Typography.fontFamily.bold, fontSize: 24, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  iconTile: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontFamily: Typography.fontFamily.semiBold, fontSize: 14, flexShrink: 1 },
  valueWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { fontFamily: Typography.fontFamily.semiBold, fontSize: 13 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sentence: { fontFamily: Typography.fontFamily.regular, fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  caution: { borderRadius: 14, padding: 14, marginTop: 6 },
  cautionText: { fontFamily: Typography.fontFamily.regular, fontSize: 12.5, lineHeight: 18 },
  cautionBold: { fontFamily: Typography.fontFamily.bold },
});
