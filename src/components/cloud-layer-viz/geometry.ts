import i18n from '@/utils/i18n';
import type { VizState } from '@/components/cloud-layer-viz/types';
import type { ScoreCloudLayerViz } from '@/services/mockData/types';

export function formatMeters(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(value));
}

export function getGap(viz: ScoreCloudLayerViz): number {
  return viz.summit_altitude - viz.cloud_base;
}

export function getSummary(gap: number): string {
  if (gap > 0) return `${i18n.t('home.cloudLayerAbove')} ${formatMeters(gap)} m`;
  if (gap < 0) return `${i18n.t('home.cloudLayerBelow')} ${formatMeters(Math.abs(gap))} m`;
  return i18n.t('home.cloudLayerTouching');
}

export function getVizState(gap: number): VizState {
  if (gap <= 0) return 'covering';
  if (gap < 700) return 'tight';
  return 'below';
}

function roundAltitude(value: number): number {
  const step = value >= 4000 ? 1000 : 500;
  return Math.ceil(value / step) * step;
}

export function getMaxAltitude(viz: ScoreCloudLayerViz): number {
  return roundAltitude(viz.summit_altitude + 1000);
}

export function projectY(
  altitude: number,
  maxAltitude: number,
  chartHeight: number,
): number {
  const top = 16;
  const bottom = chartHeight - 16;
  const usableHeight = bottom - top;
  const ratio = Math.min(1, Math.max(0, altitude / maxAltitude));
  return bottom - ratio * usableHeight;
}

export function getCloudGeometry(
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

export function getMountainGeometry(summitY: number, chartHeight: number) {
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
