import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { CHART_HEIGHT, CHART_WIDTH_INSET } from '@/components/cloud-layer-viz/constants';

export const styles = StyleSheet.create({
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
