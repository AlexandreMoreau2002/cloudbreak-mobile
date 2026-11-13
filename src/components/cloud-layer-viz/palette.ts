import { Colors } from '@/constants/colors';
import type { CloudLayerPalette } from '@/components/cloud-layer-viz/types';

export function getPalette(isDark: boolean, positiveGap: boolean): CloudLayerPalette {
  const cloudTint = positiveGap ? '92,158,110' : '212,144,74';
  const cloudTintHex = positiveGap ? '#5C9E6E' : '#D4904A';
  const cloudBgOpacity = positiveGap ? (isDark ? 0.30 : 0.24) : isDark ? 0.30 : 0.22;
  const cloudBorderOpacity = positiveGap ? (isDark ? 0.56 : 0.42) : isDark ? 0.56 : 0.40;

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
