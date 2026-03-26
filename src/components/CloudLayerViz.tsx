/**
 * CloudLayerViz
 *
 * Fichier racine volontairement court: il sert d'orchestrateur et documente
 * les 3 chemins de rendu du composant.
 *
 * 1. `compact`
 *    Utilise la mini-viz de la Home dans la ScoreCard. Cette version privilegie
 *    une geometrie stable et editoriale, avec deux pics lisibles dans un espace
 *    tres contraint.
 *
 * 2. `isSunny`
 *    Utilise un rendu dedie quand la lecture produit doit montrer un ciel degage.
 *    Ce chemin existe en compact et en detail.
 *
 * 3. rendu detaille par defaut
 *    Utilise la version complete avec resume, axe, legende et marge verticale.
 *
 * Decoupage interne:
 * - `cloud-layer-viz/geometry.ts`: calculs purs, geometrie, projection
 * - `cloud-layer-viz/palette.ts`: palette theme-aware
 * - `cloud-layer-viz/constants.ts`: tailles et geometrie compacte stable
 * - `cloud-layer-viz/styles.ts`: styles partages
 * - `cloud-layer-viz/ChartScene.tsx`: scene SVG-like/montagnes/ligne/nuages
 * - `cloud-layer-viz/CompactCloudLayerViz.tsx`: variante Home
 * - `cloud-layer-viz/DetailedCloudLayerViz.tsx`: variante detaillee
 */
import {
  getCloudGeometry,
  getMountainGeometry,
  getMaxAltitude,
  getVizState,
  projectY,
} from '@/components/cloud-layer-viz/geometry';
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { COMPACT_GEO } from '@/components/cloud-layer-viz/constants';
import type { CloudLayerVizProps } from '@/components/cloud-layer-viz/types';
import { CompactCloudLayerViz } from '@/components/cloud-layer-viz/CompactCloudLayerViz';
import { DetailedCloudLayerViz } from '@/components/cloud-layer-viz/DetailedCloudLayerViz';

export type {
  CloudLayerVizProps,
  CloudLayerVizTone,
  CloudLayerVizVariant,
} from '@/components/cloud-layer-viz/types';

export function CloudLayerViz({
  compact = false,
  tone = 'auto',
  ...props
}: CloudLayerVizProps) {
  const { scheme } = useTheme();
  const resolvedTone = tone === 'auto' ? scheme : tone;
  const isDark = resolvedTone === 'dark';

  if (compact) {
    return <CompactCloudLayerViz {...props} isDark={isDark} />;
  }

  return <DetailedCloudLayerViz {...props} isDark={isDark} />;
}

export const __private__ = {
  projectY,
  getCloudGeometry,
  getMountainGeometry,
  getCompactMountainGeometry: () => COMPACT_GEO,
  getMaxAltitude,
  getVizState,
  COMPACT_GEO,
};
