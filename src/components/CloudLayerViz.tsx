import i18n from '@/utils/i18n';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/contexts/ThemeContext';
import { StyleSheet, Text, View } from 'react-native';
import type { ScoreCloudLayerViz } from '@/services/mockData/types';

const CHART_HEIGHT = 196;
const COMPACT_CHART_HEIGHT = 164;
const CHART_WIDTH_INSET = 14;

export type CloudLayerVizVariant = 'focus' | 'ridge' | 'minimal';
export type CloudLayerVizTone = 'auto' | 'light' | 'dark';

interface CloudLayerVizProps {
  viz: ScoreCloudLayerViz;
  variant?: CloudLayerVizVariant;
  tone?: CloudLayerVizTone;
  showVariantLabel?: boolean;
  compact?: boolean;
  isSunny?: boolean;
}

type VizState = 'below' | 'tight' | 'covering';

function formatMeters(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(value));
}

function getGap(viz: ScoreCloudLayerViz): number {
  return viz.summit_altitude - viz.cloud_base;
}

function getSummary(gap: number): string {
  if (gap > 0) return `${i18n.t('home.cloudLayerAbove')} ${formatMeters(gap)} m`;
  if (gap < 0) return `${i18n.t('home.cloudLayerBelow')} ${formatMeters(Math.abs(gap))} m`;
  return i18n.t('home.cloudLayerTouching');
}

function getVizState(gap: number): VizState {
  if (gap <= 0) return 'covering';
  if (gap < 700) return 'tight';
  return 'below';
}

function roundAltitude(value: number): number {
  const step = value >= 4000 ? 1000 : 500;
  return Math.ceil(value / step) * step;
}

function getMaxAltitude(viz: ScoreCloudLayerViz): number {
  return roundAltitude(viz.summit_altitude + 1000);
}

function projectY(altitude: number, maxAltitude: number, chartHeight: number = CHART_HEIGHT): number {
  const top = 16;
  const bottom = chartHeight - 16;
  const usableHeight = bottom - top;
  const ratio = Math.min(1, Math.max(0, altitude / maxAltitude));
  return bottom - ratio * usableHeight;
}

function getCloudGeometry(
  state: VizState,
  summitY: number,
): { top: number; height: number } {
  if (state === 'below') {
    return { top: summitY + 42, height: 30 };
  }
  if (state === 'tight') {
    return { top: summitY + 4, height: 30 };
  }
  return { top: summitY - 24, height: 68 };
}

function getMountainGeometry(summitY: number, chartHeight: number) {
  const mainHeight = Math.max(48, chartHeight - summitY);
  const sideHeightLeft = Math.round(mainHeight * 0.34);
  const sideHeightRight = Math.round(mainHeight * 0.30);

  return {
    mainHeight,
    mainHalfWidth: Math.round(mainHeight * 0.62),
    leftHeight: Math.max(34, sideHeightLeft),
    leftHalfWidth: Math.max(22, Math.round(sideHeightLeft * 0.52)),
    leftOffset: 26,
    rightHeight: Math.max(30, sideHeightRight),
    rightHalfWidth: Math.max(24, Math.round(sideHeightRight * 0.58)),
    rightOffset: 30,
  };
}

// Géométrie compacte — valeurs absolues, indépendantes de l'altitude.
// Container : ~140 px large × COMPACT_CHART_HEIGHT (164) px haut.
// Petite montagne centrée à ~30 % (42 px), grande à ~63 % (88 px).
// La ligne du sommet est calée sur le pic de la grande montagne.
const COMPACT_GEO = {
  mainHeight: 92,       // grande montagne — pic à y = 164 - 92 = 72
  mainHalfW: 34,        // demi-base 34 → base 68 px, propre dans 140 px
  mainLeft: 54,         // left = 88 - 34
  smallHeight: 40,      // petite montagne — pic à y = 164 - 40 = 124
  smallHalfW: 15,       // demi-base 15 → base 30 px
  smallLeft: 27,        // left = 42 - 15
  summitLineY: 72,      // = COMPACT_CHART_HEIGHT - mainHeight
  cloudBelowY: 100,     // bande nuageuse state 'below'
  cloudTightY: 80,      // bande nuageuse state 'tight'
  cloudCoverY: 58,      // bande nuageuse state 'covering'
} as const;

function getVariantLabel(variant: CloudLayerVizVariant): string {
  if (variant === 'ridge') return 'Variant B';
  if (variant === 'minimal') return 'Variant C';
  return 'Variant A';
}

function getPalette(isDark: boolean, positiveGap: boolean) {
  const cloudTint = positiveGap ? '92,158,110' : '212,144,74';
  const cloudTintHex = positiveGap ? '#5C9E6E' : '#D4904A';
  const cloudBgOpacity = positiveGap ? (isDark ? 0.30 : 0.24) : (isDark ? 0.30 : 0.22);
  const cloudBorderOpacity = positiveGap ? (isDark ? 0.56 : 0.42) : (isDark ? 0.56 : 0.40);

  return {
    cardText: isDark ? Colors.dark.textPrimary : Colors.light.textPrimary,
    cardTextDim: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary,
    chartBg: isDark ? '#232323' : '#F2ECE2',
    chartBorder: isDark ? '#FFFFFF14' : '#DED5C7',
    summitTagBg: isDark ? '#252525' : '#F7F4EE',
    summitLineBorder: isDark ? `${cloudTintHex}${positiveGap ? 'AA' : '88'}` : '#1A1A1ACC',
    mountainLeftColor: isDark ? '#525252' : '#8D7558',
    mountainCenterColor: isDark ? '#474747' : '#6A5344',
    mountainRightColor: isDark ? '#686868' : '#9A8774',
    cloudLayerBg: `rgba(${cloudTint}, ${cloudBgOpacity})`,
    cloudLayerBorder: `rgba(${cloudTint}, ${cloudBorderOpacity})`,
    legendCardBg: isDark ? '#FFFFFF0D' : '#FBF8F3',
    legendCardBorder: isDark ? '#FFFFFF12' : '#E4DDD3',
  };
}

export function CloudLayerViz({
  viz,
  variant = 'focus',
  tone = 'auto',
  showVariantLabel = false,
  compact = false,
  isSunny = false,
}: CloudLayerVizProps) {
  const { scheme } = useTheme();
  const resolvedTone = tone === 'auto' ? scheme : tone;
  const isDark = resolvedTone === 'dark';
  const gap = getGap(viz);
  const gapIsPositive = gap > 0;
  const palette = getPalette(isDark, gapIsPositive);

  const chartHeight = compact ? COMPACT_CHART_HEIGHT : CHART_HEIGHT;
  const state = getVizState(gap);
  const maxAltitude = getMaxAltitude(viz);
  const summitY = projectY(viz.summit_altitude, maxAltitude, chartHeight);
  const cloud = getCloudGeometry(state, summitY);
  const mountain = getMountainGeometry(summitY, chartHeight);
  const effectiveSummitY = compact ? COMPACT_GEO.summitLineY : summitY;
  const effectiveCloud = compact
    ? {
        top: state === 'below' ? COMPACT_GEO.cloudBelowY : state === 'tight' ? COMPACT_GEO.cloudTightY : COMPACT_GEO.cloudCoverY,
        height: state === 'covering' ? 50 : 24,
      }
    : cloud;

  const chartContent = (
    <>
      <View style={[styles.mountainWrap, { height: chartHeight }]}>
        {compact ? (
          <>
            <View
              style={[
                styles.sideMountainLeft,
                {
                  left: COMPACT_GEO.smallLeft,
                  borderLeftWidth: COMPACT_GEO.smallHalfW,
                  borderRightWidth: COMPACT_GEO.smallHalfW,
                  borderBottomWidth: COMPACT_GEO.smallHeight,
                  borderBottomColor: palette.mountainLeftColor,
                },
              ]}
            />
            <View
              style={[
                styles.mainMountain,
                {
                  left: COMPACT_GEO.mainLeft,
                  borderLeftWidth: COMPACT_GEO.mainHalfW,
                  borderRightWidth: COMPACT_GEO.mainHalfW,
                  borderBottomWidth: COMPACT_GEO.mainHeight,
                  borderBottomColor: palette.mountainCenterColor,
                },
              ]}
            />
          </>
        ) : (
          <>
            <View
              style={[
                styles.sideMountainLeft,
                {
                  left: mountain.leftOffset,
                  borderLeftWidth: mountain.leftHalfWidth,
                  borderRightWidth: mountain.leftHalfWidth,
                  borderBottomWidth: mountain.leftHeight,
                  borderBottomColor: palette.mountainLeftColor,
                },
              ]}
            />
            <View
              style={[
                styles.mainMountain,
                {
                  marginLeft: -mountain.mainHalfWidth,
                  borderLeftWidth: mountain.mainHalfWidth,
                  borderRightWidth: mountain.mainHalfWidth,
                  borderBottomWidth: mountain.mainHeight,
                  borderBottomColor: palette.mountainCenterColor,
                },
              ]}
            />
            <View
              style={[
                styles.sideMountainRight,
                {
                  right: mountain.rightOffset,
                  borderLeftWidth: mountain.rightHalfWidth,
                  borderRightWidth: mountain.rightHalfWidth,
                  borderBottomWidth: mountain.rightHeight,
                  borderBottomColor: palette.mountainRightColor,
                },
              ]}
            />
          </>
        )}
      </View>
      <View style={[styles.cloudLayer, { top: effectiveCloud.top, height: effectiveCloud.height, backgroundColor: palette.cloudLayerBg, borderColor: palette.cloudLayerBorder }]} />
      <View
        style={[
          styles.summitLine,
          compact ? styles.summitLineCompact : null,
          { top: effectiveSummitY },
        ]}
      >
        <Text
          style={[
            styles.summitTag,
            compact ? styles.summitTagCompact : null,
            { backgroundColor: palette.summitTagBg, color: palette.cardText },
          ]}
        >
          {formatMeters(viz.summit_altitude)} m
        </Text>
        <View style={[styles.summitLineTrack, { borderTopColor: palette.summitLineBorder }]} />
      </View>
    </>
  );

  if (isSunny) {
    const RAY_ANGLES = [200, 220, 240, 260, 280];
    // En compact, utilise COMPACT_GEO. Sinon, géométrie calquée sur ~62% du chart (cohérent avec A/B/C).
    const sunnySummitLineY = compact ? COMPACT_GEO.summitLineY : chartHeight - Math.round(chartHeight * 0.62);
    const sunnyMountain = getMountainGeometry(sunnySummitLineY, chartHeight);

    const sunnyChartContent = (
      <>
        <View style={styles.sunHalo} />
        <View style={styles.sunCircle} />
        {RAY_ANGLES.map((angle) => (
          <View key={angle} style={[styles.sunRay, { transform: [{ rotate: `${angle}deg` }] }]} />
        ))}
        <View style={[styles.summitLine, compact ? styles.summitLineCompact : null, { top: sunnySummitLineY }]}>
          <Text style={[styles.summitTag, compact ? styles.summitTagCompact : null, { backgroundColor: palette.summitTagBg, color: palette.cardText }]}>
            {formatMeters(viz.summit_altitude)} m
          </Text>
          <View style={[styles.summitLineTrack, { borderTopColor: palette.summitLineBorder }]} />
        </View>
        <View style={[styles.mountainWrap, { height: chartHeight }]}>
          {compact ? (
            <>
              <View style={[styles.sideMountainLeft, {
                left: COMPACT_GEO.smallLeft,
                borderLeftWidth: COMPACT_GEO.smallHalfW,
                borderRightWidth: COMPACT_GEO.smallHalfW,
                borderBottomWidth: COMPACT_GEO.smallHeight,
                borderBottomColor: palette.mountainLeftColor,
              }]} />
              <View style={[styles.mainMountain, {
                left: COMPACT_GEO.mainLeft,
                borderLeftWidth: COMPACT_GEO.mainHalfW,
                borderRightWidth: COMPACT_GEO.mainHalfW,
                borderBottomWidth: COMPACT_GEO.mainHeight,
                borderBottomColor: palette.mountainCenterColor,
              }]} />
            </>
          ) : (
            <>
              <View style={[styles.sideMountainLeft, {
                left: sunnyMountain.leftOffset,
                borderLeftWidth: sunnyMountain.leftHalfWidth,
                borderRightWidth: sunnyMountain.leftHalfWidth,
                borderBottomWidth: sunnyMountain.leftHeight,
                borderBottomColor: palette.mountainLeftColor,
              }]} />
              <View style={[styles.mainMountain, {
                marginLeft: -sunnyMountain.mainHalfWidth,
                borderLeftWidth: sunnyMountain.mainHalfWidth,
                borderRightWidth: sunnyMountain.mainHalfWidth,
                borderBottomWidth: sunnyMountain.mainHeight,
                borderBottomColor: palette.mountainCenterColor,
              }]} />
              <View style={[styles.sideMountainRight, {
                right: sunnyMountain.rightOffset,
                borderLeftWidth: sunnyMountain.rightHalfWidth,
                borderRightWidth: sunnyMountain.rightHalfWidth,
                borderBottomWidth: sunnyMountain.rightHeight,
                borderBottomColor: palette.mountainRightColor,
              }]} />
            </>
          )}
        </View>
      </>
    );

    const sunnyChart = (
      <View style={[styles.chart, compact && { flex: 0 }, { height: chartHeight, backgroundColor: palette.chartBg, borderColor: palette.chartBorder }]} testID="cloud-layer-viz-sunny">
        {sunnyChartContent}
      </View>
    );

    if (compact) return sunnyChart;

    return (
      <View style={styles.container} testID="cloud-layer-viz">
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.cardText }]}>{i18n.t('score.sunny')}</Text>
        </View>
        <Text style={[styles.summary, { color: palette.cardTextDim }]}>{i18n.t('home.cloudLayerBelow')} {formatMeters(Math.abs(viz.cloud_base - viz.summit_altitude))} m</Text>
        <View style={styles.chartRow}>
          <View style={styles.axis}>
            <Text style={[styles.axisLabel, { color: palette.cardTextDim }]}>{formatMeters(maxAltitude)} m</Text>
            <Text style={[styles.axisLabel, { color: palette.cardTextDim }]}>0 m</Text>
          </View>
          {sunnyChart}
        </View>
        {showVariantLabel ? <Text style={styles.variantTag}>{getVariantLabel(variant)}</Text> : null}
      </View>
    );
  }

  if (compact) {
    return (
      <View style={[styles.chart, { flex: 0, height: chartHeight, backgroundColor: palette.chartBg, borderColor: palette.chartBorder }]}>
        {chartContent}
      </View>
    );
  }

  return (
    <View style={styles.container} testID="cloud-layer-viz">
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.cardText }]}>{i18n.t('home.cloudLayerTitle')}</Text>
        <View style={[styles.marginPill, gapIsPositive ? styles.marginPillPositive : styles.marginPillWarning, { borderColor: gapIsPositive ? '#5C9E6E55' : '#D4904A55' }]}>
          <Text style={[styles.marginPillText, gapIsPositive ? styles.marginPillTextPositive : styles.marginPillTextWarning]}>
            {gapIsPositive ? '+' : ''}
            {formatMeters(Math.abs(gap))} m
          </Text>
        </View>
      </View>

      <Text style={[styles.summary, { color: palette.cardTextDim }]}>{getSummary(gap)}</Text>

      <View style={styles.chartRow}>
        <View style={styles.axis}>
          <Text style={[styles.axisLabel, { color: palette.cardTextDim }]}>{formatMeters(maxAltitude)} m</Text>
          <Text style={[styles.axisLabel, { color: palette.cardTextDim }]}>0 m</Text>
        </View>

        <View style={[styles.chart, { height: chartHeight, backgroundColor: palette.chartBg, borderColor: palette.chartBorder }]}>
          {chartContent}
        </View>
      </View>

      <View style={styles.legendRow}>
        <View style={[styles.legendCard, { backgroundColor: palette.legendCardBg, borderColor: palette.legendCardBorder }]}>
          <Text style={[styles.legendLabel, { color: palette.cardTextDim }]}>{i18n.t('home.summitShort')}</Text>
          <Text style={[styles.legendValue, { color: palette.cardText }]}>{formatMeters(viz.summit_altitude)} m</Text>
        </View>
        <View style={[styles.legendCard, { backgroundColor: palette.legendCardBg, borderColor: palette.legendCardBorder }]}>
          <Text style={[styles.legendLabel, { color: palette.cardTextDim }]}>{i18n.t('home.cloudBaseShort')}</Text>
          <Text style={[styles.legendValue, { color: palette.cardText }]}>{formatMeters(viz.cloud_base)} m</Text>
        </View>
        <View style={[styles.legendCard, { backgroundColor: palette.legendCardBg, borderColor: palette.legendCardBorder }]}>
          <Text style={[styles.legendLabel, { color: palette.cardTextDim }]}>{i18n.t('home.cloudLayerMargin')}</Text>
          <Text style={[styles.legendValue, { color: palette.cardText }, gapIsPositive ? styles.legendValuePositive : styles.legendValueWarning]}>
            {gapIsPositive ? '+' : ''}
            {formatMeters(Math.abs(gap))} m
          </Text>
        </View>
      </View>

      <Text style={[styles.footer, { color: palette.cardTextDim }]}>
        {gapIsPositive ? i18n.t('home.cloudLayerComfortable') : i18n.t('home.cloudLayerTight')}
      </Text>

      {showVariantLabel ? <Text style={styles.variantTag}>{getVariantLabel(variant)}</Text> : null}
    </View>
  );
}

export const __private__ = {
  projectY,
  getCloudGeometry,
  getMountainGeometry,
  getCompactMountainGeometry: () => COMPACT_GEO,
  COMPACT_GEO,
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  title: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    flexShrink: 1,
  },
  marginPill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  marginPillPositive: {
    backgroundColor: '#4CAF501A',
  },
  marginPillWarning: {
    backgroundColor: '#FF98001A',
  },
  marginPillText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
  },
  marginPillTextPositive: {
    color: Colors.score.high,
  },
  marginPillTextWarning: {
    color: Colors.score.medium,
  },
  summary: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    lineHeight: Math.round(Typography.fontSize.sm * 1.4),
  },
  chartRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'stretch',
  },
  axis: {
    width: 64,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  axisLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
  },
  chart: {
    flex: 1,
    height: CHART_HEIGHT,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  cloudLayer: {
    position: 'absolute',
    left: CHART_WIDTH_INSET,
    right: CHART_WIDTH_INSET,
    borderWidth: 1,
    borderRadius: Radius.full,
    zIndex: 2,
  },
  summitLine: {
    position: 'absolute',
    left: CHART_WIDTH_INSET,
    right: CHART_WIDTH_INSET,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    zIndex: 3,
  },
  summitLineCompact: {
    left: 6,
    right: 8,
    gap: 3,
  },
  summitLineTrack: {
    flex: 1,
    borderTopWidth: 1,
  },
  summitTag: {
    transform: [{ translateY: -11 }],
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    zIndex: 4,
  },
  summitTagCompact: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 3,
    transform: [{ translateY: -10 }],
  },
  mountainWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  sideMountainLeft: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  mainMountain: {
    position: 'absolute',
    left: '50%',
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  sideMountainRight: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  legendRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  legendCard: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  legendLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legendValue: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
  },
  legendValuePositive: {
    color: Colors.score.high,
  },
  legendValueWarning: {
    color: Colors.score.medium,
  },
  footer: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
  },
  variantTag: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    alignSelf: 'flex-end',
  },
  sunRay: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 2,
    height: 48,
    borderRadius: 1,
    backgroundColor: '#D4900077',
    transformOrigin: 'top right',
  },
  // Soleil dessin d'enfant — quart de cercle dans le coin supérieur droit
  sunHalo: {
    position: 'absolute',
    top: -28,
    right: -28,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D4900022',
    borderWidth: 1.5,
    borderColor: '#D4900055',
  },
  sunCircle: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D49000CC',
  },
});
