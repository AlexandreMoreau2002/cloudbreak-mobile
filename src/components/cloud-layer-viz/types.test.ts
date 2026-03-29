import type {
  CloudLayerPalette,
  CloudLayerVizProps,
  CloudLayerVizTone,
  CloudLayerVizVariant,
  VizState,
} from '@/components/cloud-layer-viz/types';

describe('cloud-layer-viz/types', () => {
  it('permet de typer les variants et tons attendus', () => {
    const variant: CloudLayerVizVariant = 'focus';
    const tone: CloudLayerVizTone = 'dark';
    const state: VizState = 'tight';
    expect({ variant, tone, state }).toEqual({ variant: 'focus', tone: 'dark', state: 'tight' });
  });

  it('permet de typer les props et palette', () => {
    const palette: CloudLayerPalette = {
      cardText: '#000',
      cardTextDim: '#666',
      chartBg: '#fff',
      chartBorder: '#ddd',
      summitTagBg: '#fff',
      summitLineBorder: '#111',
      mountainLeftColor: '#111',
      mountainCenterColor: '#222',
      mountainRightColor: '#333',
      cloudLayerBg: '#444',
      cloudLayerBorder: '#555',
      legendCardBg: '#666',
      legendCardBorder: '#777',
    };
    const props: CloudLayerVizProps = {
      viz: { summit_altitude: 1000, cloud_base: 800, pressure_levels: [] },
      variant: 'minimal',
      tone: 'light',
      showVariantLabel: true,
      compact: false,
      isSunny: false,
    };
    expect(palette.cardText).toBe('#000');
    expect(props.variant).toBe('minimal');
  });
});
