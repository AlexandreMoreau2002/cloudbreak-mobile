import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CompactCloudLayerViz, __private__ } from '@/components/cloud-layer-viz/CompactCloudLayerViz';

const viz = {
  summit_altitude: 2257,
  cloud_base: 1200,
  pressure_levels: [],
};

describe('cloud-layer-viz/CompactCloudLayerViz', () => {
  it('force les états compacts selon la variante', () => {
    expect(__private__.resolveCompactState('below', 'ridge')).toBe('tight');
    expect(__private__.resolveCompactState('tight', 'minimal')).toBe('covering');
    expect(__private__.resolveCompactState('covering', 'focus')).toBe('below');
  });

  it('rend une mini-viz sunny avec son testID dédié', () => {
    render(<CompactCloudLayerViz viz={viz} isSunny isDark={false} />);
    expect(screen.getByTestId('cloud-layer-viz-sunny')).toBeTruthy();
  });
});
