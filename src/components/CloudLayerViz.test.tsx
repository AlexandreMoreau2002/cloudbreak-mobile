import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { __private__, CloudLayerViz } from '@/components/CloudLayerViz';

jest.mock('@/utils/i18n', () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      'home.cloudLayerTitle': 'Couche nuageuse vs sommet',
      'home.summitShort': 'Sommet',
      'home.cloudBaseShort': 'Base',
      'home.cloudLayerAbove': 'Sommet au-dessus de la base nuageuse',
      'home.cloudLayerBelow': 'Base nuageuse au-dessus du sommet de',
      'home.cloudLayerTouching': 'Base nuageuse au niveau du sommet',
      'home.cloudLayerMargin': 'Marge verticale',
      'home.cloudLayerComfortable': 'Lecture simple: marge confortable pour passer au-dessus.',
      'home.cloudLayerTight': 'Lecture simple: la marge est faible ou nulle.',
      'score.sunny': 'Ciel dégagé',
    };
    return map[key] ?? key;
  },
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ scheme: 'light' }),
}));

describe('CloudLayerViz', () => {
  it('affiche une lecture simple quand le sommet est au-dessus de la base nuageuse', () => {
    render(
      <CloudLayerViz
        viz={{
          summit_altitude: 2257,
          cloud_base: 1200,
          pressure_levels: [],
        }}
      />,
    );

    expect(screen.getByTestId('cloud-layer-viz')).toBeTruthy();
    expect(screen.getByText('Couche nuageuse vs sommet')).toBeTruthy();
    expect(screen.getByText(/Sommet au-dessus de la base nuageuse.*1[\s\u202f]057 m/)).toBeTruthy();
    expect(screen.getAllByText(/\+?1[\s\u202f]057 m/).length).toBeGreaterThan(0);
    expect(screen.getByText('Marge verticale')).toBeTruthy();
    expect(screen.getByText('Lecture simple: marge confortable pour passer au-dessus.')).toBeTruthy();
    expect(screen.getAllByText('Sommet').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Base').length).toBeGreaterThan(0);
  });

  it('affiche un état prudent quand la base nuageuse dépasse le sommet', () => {
    render(
      <CloudLayerViz
        viz={{
          summit_altitude: 1800,
          cloud_base: 2200,
          pressure_levels: [],
        }}
      />,
    );

    expect(screen.getByText(/Base nuageuse au-dessus du sommet de.*400 m/)).toBeTruthy();
    expect(screen.getByText('Lecture simple: la marge est faible ou nulle.')).toBeTruthy();
  });

  it('affiche le mode sunny quand isSunny est true', () => {
    render(
      <CloudLayerViz
        viz={{ summit_altitude: 476, cloud_base: 5000, pressure_levels: [] }}
        isSunny
      />,
    );
    expect(screen.getByTestId('cloud-layer-viz')).toBeTruthy();
    expect(screen.getByText('Ciel dégagé')).toBeTruthy();
  });

  it('affiche le mode sunny compact sans texte', () => {
    render(
      <CloudLayerViz
        viz={{ summit_altitude: 476, cloud_base: 5000, pressure_levels: [] }}
        isSunny
        compact
      />,
    );
    expect(screen.getByTestId('cloud-layer-viz-sunny')).toBeTruthy();
  });

  it('affiche un état serré quand la marge est faible mais positive', () => {
    render(
      <CloudLayerViz
        viz={{
          summit_altitude: 1800,
          cloud_base: 1500,
          pressure_levels: [],
        }}
      />,
    );

    expect(screen.getByText(/Sommet au-dessus de la base nuageuse.*300 m/)).toBeTruthy();
    expect(screen.getByText('Lecture simple: marge confortable pour passer au-dessus.')).toBeTruthy();
  });

  it('reste lisible en tone light explicite', () => {
    render(
      <CloudLayerViz
        viz={{
          summit_altitude: 2257,
          cloud_base: 1200,
          pressure_levels: [],
        }}
        tone="light"
      />,
    );

    expect(screen.getByText('Couche nuageuse vs sommet')).toBeTruthy();
    expect(screen.getByText('Lecture simple: marge confortable pour passer au-dessus.')).toBeTruthy();
  });

  it('reste lisible en tone dark explicite', () => {
    render(
      <CloudLayerViz
        viz={{
          summit_altitude: 1800,
          cloud_base: 2200,
          pressure_levels: [],
        }}
        tone="dark"
      />,
    );

    expect(screen.getByText(/Base nuageuse au-dessus du sommet de.*400 m/)).toBeTruthy();
    expect(screen.getByText('Lecture simple: la marge est faible ou nulle.')).toBeTruthy();
  });

  it('affiche les labels de variante quand demandé', () => {
    const { rerender } = render(
      <CloudLayerViz
        viz={{
          summit_altitude: 2257,
          cloud_base: 1200,
          pressure_levels: [],
        }}
        variant="ridge"
        showVariantLabel
      />,
    );

    expect(screen.getByText('Variant B')).toBeTruthy();

    rerender(
      <CloudLayerViz
        viz={{
          summit_altitude: 2257,
          cloud_base: 1200,
          pressure_levels: [],
        }}
        variant="minimal"
        showVariantLabel
      />,
    );

    expect(screen.getByText('Variant C')).toBeTruthy();
  });

  it('affiche un état neutre quand la base nuageuse est au niveau du sommet', () => {
    render(
      <CloudLayerViz
        viz={{
          summit_altitude: 1800,
          cloud_base: 1800,
          pressure_levels: [],
        }}
      />,
    );

    expect(screen.getAllByText('0 m').length).toBeGreaterThan(0);
    expect(screen.getByText('Base nuageuse au niveau du sommet')).toBeTruthy();
    expect(screen.getByText('Lecture simple: la marge est faible ou nulle.')).toBeTruthy();
  });

  it('aligne bien le sommet principal avec la ligne sommet', () => {
    const summitY = __private__.projectY(2257, 3500, 196);
    const mountain = __private__.getMountainGeometry(summitY, 196);

    expect(Math.round(196 - mountain.mainHeight)).toBe(Math.round(summitY));
    expect(mountain.leftHeight).toBeLessThan(mountain.mainHeight);
    expect(mountain.rightHeight).toBeLessThan(mountain.mainHeight);
  });

  it('place le nuage couvrant autour de la ligne sommet quand la base dépasse le sommet', () => {
    const summitY = __private__.projectY(1800, 3000, 196);
    const cloud = __private__.getCloudGeometry('covering', summitY);

    expect(cloud.top).toBeLessThan(summitY);
    expect(cloud.top + cloud.height).toBeGreaterThan(summitY);
  });

  it('utilise une géométrie compact plus resserrée pour la Home', () => {
    const summitY = __private__.projectY(2257, 3500, 164);
    const regularMountain = __private__.getMountainGeometry(summitY, 164);
    const { COMPACT_GEO } = __private__;

    expect(COMPACT_GEO.mainHalfW).toBeLessThan(regularMountain.mainHalfWidth);
    expect(COMPACT_GEO.smallHeight).toBeLessThan(COMPACT_GEO.mainHeight);
    expect(COMPACT_GEO.smallHalfW).toBeLessThan(COMPACT_GEO.mainHalfW);
    expect(COMPACT_GEO.summitLineY).toBe(164 - COMPACT_GEO.mainHeight);
  });
});
