import { getPalette } from '@/components/cloud-layer-viz/palette';

describe('cloud-layer-viz/palette', () => {
  it('retourne une palette claire', () => {
    const palette = getPalette(false, true);
    expect(palette.cardText).toBeTruthy();
    expect(palette.cloudLayerBg).toContain('92,158,110');
  });

  it('retourne une palette sombre', () => {
    const palette = getPalette(true, false);
    expect(palette.chartBg).toBe('#232323');
    expect(palette.cloudLayerBorder).toContain('212,144,74');
  });
});
