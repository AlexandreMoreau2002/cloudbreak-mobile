import {
  getGap,
  projectY,
  getVizState,
  getMaxAltitude,
  getCloudGeometry,
  getCompactCloudGeometry,
} from '@/components/cloud-layer-viz/geometry';
import React from 'react';
import { View } from 'react-native';
import { styles } from '@/components/cloud-layer-viz/styles';
import { getPalette } from '@/components/cloud-layer-viz/palette';
import { ChartScene } from '@/components/cloud-layer-viz/ChartScene';
import { COMPACT_CHART_HEIGHT } from '@/components/cloud-layer-viz/constants';
import type { CloudLayerVizProps, VizState } from '@/components/cloud-layer-viz/types';

interface CompactCloudLayerVizProps extends Pick<CloudLayerVizProps, 'viz' | 'isSunny' | 'variant'> {
  isDark: boolean;
}

function resolveCompactState(state: VizState, variant: CloudLayerVizProps['variant']): VizState {
  if (variant === 'ridge') return 'tight';
  if (variant === 'minimal') return 'covering';
  if (variant === 'focus') return 'below';
  return state;
}

export function CompactCloudLayerViz({
  viz,
  isSunny = false,
  variant,
  isDark,
}: CompactCloudLayerVizProps) {
  const gap = getGap(viz);
  const state = resolveCompactState(getVizState(gap), variant);
  const palette = getPalette(isDark, gap > 0);
  const summitY = projectY(viz.summit_altitude, getMaxAltitude(viz), COMPACT_CHART_HEIGHT);
  const cloud = getCloudGeometry(state, summitY);
  const effectiveCloud = getCompactCloudGeometry(state);

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

export const __private__ = {
  resolveCompactState,
};
