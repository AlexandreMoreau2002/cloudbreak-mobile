/**
 * ChartScene — scene visuelle partagee de la cloud viz.
 *
 * Ce composant ne porte pas la logique produit du score. Il rend uniquement
 * la scene graphique a partir d'une geometrie deja calculee :
 * - montagnes
 * - ligne du sommet et tag altitude
 * - couche nuageuse
 * - variante ciel degage avec soleil
 *
 * Il est reutilise par les variantes compacte et detaillee afin de mutualiser
 * le rendu de base sans dupliquer la scene.
 *
 * Props :
 *   viz          ScoreCloudLayerViz  — donnees de visualisation du score
 *   palette      CloudLayerPalette   — palette deja resolue selon le theme
 *   chartHeight  number              — hauteur utile de la scene
 *   compact      boolean             — active la geometrie compacte Home
 *   isSunny      boolean             — active le rendu ciel degage
 *   state        VizState            — etat visuel calcule de la couche
 *   summitY      number              — position verticale du sommet
 *   cloud        { top, height }     — geometrie projetee de la couche
 */
import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '@/components/cloud-layer-viz/styles';
import type { ScoreCloudLayerViz } from '@/services/mockData/types';
import { COMPACT_GEO } from '@/components/cloud-layer-viz/constants';
import type { CloudLayerPalette, VizState } from '@/components/cloud-layer-viz/types';
import { formatMeters, getMountainGeometry } from '@/components/cloud-layer-viz/geometry';

interface ChartSceneProps {
  viz: ScoreCloudLayerViz;
  palette: CloudLayerPalette;
  chartHeight: number;
  compact: boolean;
  isSunny: boolean;
  state: VizState;
  summitY: number;
  cloud: { top: number; height: number };
}

export function ChartScene({
  viz,
  palette,
  chartHeight,
  compact,
  isSunny,
  summitY,
  cloud,
}: ChartSceneProps) {
  const RAY_ANGLES = [200, 220, 240, 260, 280];
  const mountain = getMountainGeometry(summitY, chartHeight);
  const effectiveSummitY = compact ? COMPACT_GEO.summitLineY : summitY;
  const sunnyMountain = getMountainGeometry(
    compact ? COMPACT_GEO.summitLineY : chartHeight - Math.round(chartHeight * 0.62),
    chartHeight,
  );
  const sunnySummitLineY = compact ? COMPACT_GEO.summitLineY : chartHeight - Math.round(chartHeight * 0.62);

  if (isSunny) {
    return (
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
                    left: sunnyMountain.leftOffset,
                    borderLeftWidth: sunnyMountain.leftHalfWidth,
                    borderRightWidth: sunnyMountain.leftHalfWidth,
                    borderBottomWidth: sunnyMountain.leftHeight,
                    borderBottomColor: palette.mountainLeftColor,
                  },
                ]}
              />
              <View
                style={[
                  styles.mainMountain,
                  {
                    marginLeft: -sunnyMountain.mainHalfWidth,
                    borderLeftWidth: sunnyMountain.mainHalfWidth,
                    borderRightWidth: sunnyMountain.mainHalfWidth,
                    borderBottomWidth: sunnyMountain.mainHeight,
                    borderBottomColor: palette.mountainCenterColor,
                  },
                ]}
              />
              <View
                style={[
                  styles.sideMountainRight,
                  {
                    right: sunnyMountain.rightOffset,
                    borderLeftWidth: sunnyMountain.rightHalfWidth,
                    borderRightWidth: sunnyMountain.rightHalfWidth,
                    borderBottomWidth: sunnyMountain.rightHeight,
                    borderBottomColor: palette.mountainRightColor,
                  },
                ]}
              />
            </>
          )}
        </View>
      </>
    );
  }

  return (
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
      <View
        style={[
          styles.cloudLayer,
          compact ? styles.cloudLayerCompact : null,
          {
            top: cloud.top,
            height: cloud.height,
            backgroundColor: palette.cloudLayerBg,
            borderColor: palette.cloudLayerBorder,
          },
        ]}
      />
      <View style={[styles.summitLine, compact ? styles.summitLineCompact : null, { top: effectiveSummitY }]}>
        <Text style={[styles.summitTag, compact ? styles.summitTagCompact : null, { backgroundColor: palette.summitTagBg, color: palette.cardText }]}>
          {formatMeters(viz.summit_altitude)} m
        </Text>
        <View style={[styles.summitLineTrack, { borderTopColor: palette.summitLineBorder }]} />
      </View>
    </>
  );
}
