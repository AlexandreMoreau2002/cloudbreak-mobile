import {
  formatMeters,
  getCloudGeometry,
  getCompactCloudGeometry,
  getGap,
  getMaxAltitude,
  getMountainGeometry,
  getSummary,
  getVizState,
  projectY,
} from '@/components/cloud-layer-viz/geometry';

jest.mock('@/utils/i18n', () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      'home.cloudLayerAbove': 'Sommet au-dessus de la base nuageuse',
      'home.cloudLayerBelow': 'Base nuageuse au-dessus du sommet de',
      'home.cloudLayerTouching': 'Base nuageuse au niveau du sommet',
    };
    return map[key] ?? key;
  },
}));

const viz = {
  summit_altitude: 2257,
  cloud_base: 1200,
  pressure_levels: [],
};

describe('cloud-layer-viz/geometry', () => {
  it('formate les mètres en fr-FR', () => {
    expect(formatMeters(1057)).toMatch(/1[\s\u202f]057/);
  });

  it('calcule le gap et le résumé positif', () => {
    expect(getGap(viz)).toBe(1057);
    expect(getSummary(1057)).toContain('Sommet au-dessus');
  });

  it('retourne un résumé négatif ou touchant', () => {
    expect(getSummary(-400)).toContain('Base nuageuse au-dessus');
    expect(getSummary(0)).toBe('Base nuageuse au niveau du sommet');
  });

  it('détermine correctement les états', () => {
    expect(getVizState(-1)).toBe('covering');
    expect(getVizState(200)).toBe('tight');
    expect(getVizState(800)).toBe('below');
  });

  it('calcule une altitude max arrondie et projette Y', () => {
    expect(getMaxAltitude(viz)).toBe(3500);
    expect(projectY(2257, 3500, 196)).toBeGreaterThan(16);
  });

  it('retourne des géométries cloud attendues', () => {
    expect(getCloudGeometry('below', 72)).toEqual({ top: 114, height: 30 });
    expect(getCompactCloudGeometry('covering')).toEqual({ top: 58, height: 50 });
  });

  it('retourne une géométrie montagne cohérente', () => {
    const mountain = getMountainGeometry(72, 196);
    expect(mountain.mainHeight).toBeGreaterThan(48);
    expect(mountain.leftOffset).toBe(26);
  });
});
