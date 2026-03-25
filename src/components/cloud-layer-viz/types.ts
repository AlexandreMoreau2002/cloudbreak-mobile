import type { ScoreCloudLayerViz } from '@/services/mockData/types';

export type CloudLayerVizVariant = 'focus' | 'ridge' | 'minimal';
export type CloudLayerVizTone = 'auto' | 'light' | 'dark';
export type VizState = 'below' | 'tight' | 'covering';

export interface CloudLayerVizProps {
  viz: ScoreCloudLayerViz;
  variant?: CloudLayerVizVariant;
  tone?: CloudLayerVizTone;
  showVariantLabel?: boolean;
  compact?: boolean;
  isSunny?: boolean;
}

export interface CloudLayerPalette {
  cardText: string;
  cardTextDim: string;
  chartBg: string;
  chartBorder: string;
  summitTagBg: string;
  summitLineBorder: string;
  mountainLeftColor: string;
  mountainCenterColor: string;
  mountainRightColor: string;
  cloudLayerBg: string;
  cloudLayerBorder: string;
  legendCardBg: string;
  legendCardBorder: string;
}
