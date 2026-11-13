import { CHART_HEIGHT, CHART_WIDTH_INSET, COMPACT_CHART_HEIGHT, COMPACT_GEO } from '@/components/cloud-layer-viz/constants';

describe('cloud-layer-viz/constants', () => {
  it('expose les constantes de dimensions attendues', () => {
    expect(CHART_HEIGHT).toBe(196);
    expect(CHART_WIDTH_INSET).toBe(14);
    expect(COMPACT_CHART_HEIGHT).toBe(164);
  });

  it('expose la géométrie compacte fixe attendue', () => {
    expect(COMPACT_GEO).toMatchObject({
      summitLineY: 72,
      cloudBelowY: 100,
      cloudTightY: 80,
      cloudCoverY: 58,
    });
  });
});
