import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { getPalette } from '@/components/cloud-layer-viz/palette';
import { ChartScene } from '@/components/cloud-layer-viz/ChartScene';

const viz = {
  summit_altitude: 2257,
  cloud_base: 1200,
  pressure_levels: [],
};

describe('cloud-layer-viz/ChartScene', () => {
  it('rend le sommet en mode normal', () => {
    render(
      <ChartScene
        viz={viz}
        palette={getPalette(false, true)}
        chartHeight={196}
        compact={false}
        isSunny={false}
        state="below"
        summitY={72}
        cloud={{ top: 100, height: 30 }}
      />,
    );

    expect(screen.getByText(/2[\s\u202f]257 m/)).toBeTruthy();
  });

  it('rend aussi le sommet en mode sunny compact', () => {
    render(
      <ChartScene
        viz={viz}
        palette={getPalette(false, true)}
        chartHeight={164}
        compact
        isSunny
        state="below"
        summitY={72}
        cloud={{ top: 100, height: 30 }}
      />,
    );

    expect(screen.getByText(/2[\s\u202f]257 m/)).toBeTruthy();
  });
});
