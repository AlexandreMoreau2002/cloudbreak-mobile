import { COMPACT_CHART_HEIGHT, COMPACT_GEO } from '@/components/cloud-layer-viz/constants';
import { ChartScene } from '@/components/cloud-layer-viz/ChartScene';
import { getCloudGeometry, getGap, getMaxAltitude, getVizState, projectY } from '@/components/cloud-layer-viz/geometry';
import { getPalette } from '@/components/cloud-layer-viz/palette';
import { styles } from '@/components/cloud-layer-viz/styles';
import type { CloudLayerVizProps } from '@/components/cloud-layer-viz/types';
import React from 'react';
import { View } from 'react-native';

interface CompactCloudLayerVizProps extends Pick<CloudLayerVizProps, 'viz' | 'isSunny'> {
  isDark: boolean;
}

export function CompactCloudLayerViz({
  viz,
  isSunny = false,
  isDark,
}: CompactCloudLayerVizProps) {
  const gap = getGap(viz);
  const state = getVizState(gap);
  const palette = getPalette(isDark, gap > 0);
  const summitY = projectY(viz.summit_altitude, getMaxAltitude(viz), COMPACT_CHART_HEIGHT);
  const cloud = getCloudGeometry(state, summitY);
  const effectiveCloud = {
    top:
      state === 'below'
        ? COMPACT_GEO.cloudBelowY
        : state === 'tight'
          ? COMPACT_GEO.cloudTightY
          : COMPACT_GEO.cloudCoverY,
    height: state === 'covering' ? 50 : 24,
  };

  return (
    <View
      style={[
        styles.chart,
        {
          flex: 0,
          height: COMPACT_CHART_HEIGHT,
          backgroundColor: palette.chartBg,
          borderColor: palette.chartBorder,
        },
      ]}
      testID={isSunny ? 'cloud-layer-viz-sunny' : undefined}
    >
      <ChartScene
        viz={viz}
        palette={palette}
        chartHeight={COMPACT_CHART_HEIGHT}
        compact
        isSunny={isSunny}
        state={state}
        summitY={summitY}
        cloud={isSunny ? cloud : effectiveCloud}
      />
    </View>
  );
}
