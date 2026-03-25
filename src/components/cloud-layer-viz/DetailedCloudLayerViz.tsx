import i18n from '@/utils/i18n';
import { CHART_HEIGHT } from '@/components/cloud-layer-viz/constants';
import { ChartScene } from '@/components/cloud-layer-viz/ChartScene';
import {
  formatMeters,
  getCloudGeometry,
  getGap,
  getMaxAltitude,
  getSummary,
  getVizState,
  projectY,
} from '@/components/cloud-layer-viz/geometry';
import { getPalette } from '@/components/cloud-layer-viz/palette';
import { styles } from '@/components/cloud-layer-viz/styles';
import type { CloudLayerVizProps } from '@/components/cloud-layer-viz/types';
import React from 'react';
import { Text, View } from 'react-native';

interface DetailedCloudLayerVizProps
  extends Pick<CloudLayerVizProps, 'viz' | 'variant' | 'showVariantLabel' | 'isSunny'> {
  isDark: boolean;
}

function getVariantLabel(variant: NonNullable<CloudLayerVizProps['variant']>) {
  if (variant === 'ridge') return 'Variant B';
  if (variant === 'minimal') return 'Variant C';
  return 'Variant A';
}

export function DetailedCloudLayerViz({
  viz,
  variant = 'focus',
  showVariantLabel = false,
  isSunny = false,
  isDark,
}: DetailedCloudLayerVizProps) {
  const gap = getGap(viz);
  const gapIsPositive = gap > 0;
  const palette = getPalette(isDark, gapIsPositive);
  const state = getVizState(gap);
  const maxAltitude = getMaxAltitude(viz);
  const summitY = projectY(viz.summit_altitude, maxAltitude, CHART_HEIGHT);
  const cloud = getCloudGeometry(state, summitY);

  const chart = (
    <View style={[styles.chart, { height: CHART_HEIGHT, backgroundColor: palette.chartBg, borderColor: palette.chartBorder }]}>
      <ChartScene
        viz={viz}
        palette={palette}
        chartHeight={CHART_HEIGHT}
        compact={false}
        isSunny={isSunny}
        state={state}
        summitY={summitY}
        cloud={cloud}
      />
    </View>
  );

  if (isSunny) {
    return (
      <View style={styles.container} testID="cloud-layer-viz">
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.cardText }]}>{i18n.t('score.sunny')}</Text>
        </View>
        <Text style={[styles.summary, { color: palette.cardTextDim }]}>
          {i18n.t('home.cloudLayerBelow')} {formatMeters(Math.abs(viz.cloud_base - viz.summit_altitude))} m
        </Text>
        <View style={styles.chartRow}>
          <View style={styles.axis}>
            <Text style={[styles.axisLabel, { color: palette.cardTextDim }]}>{formatMeters(maxAltitude)} m</Text>
            <Text style={[styles.axisLabel, { color: palette.cardTextDim }]}>0 m</Text>
          </View>
          {chart}
        </View>
        {showVariantLabel ? <Text style={styles.variantTag}>{getVariantLabel(variant)}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container} testID="cloud-layer-viz">
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.cardText }]}>{i18n.t('home.cloudLayerTitle')}</Text>
        <View
          style={[
            styles.marginPill,
            gapIsPositive ? styles.marginPillPositive : styles.marginPillWarning,
            { borderColor: gapIsPositive ? '#5C9E6E55' : '#D4904A55' },
          ]}
        >
          <Text
            style={[
              styles.marginPillText,
              gapIsPositive ? styles.marginPillTextPositive : styles.marginPillTextWarning,
            ]}
          >
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
        {chart}
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
