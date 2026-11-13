import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { DetailedCloudLayerViz } from '@/components/cloud-layer-viz/DetailedCloudLayerViz';

jest.mock('@/utils/i18n', () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      'score.sunny': 'Dégagé',
      'home.cloudLayerBelow': 'Base nuageuse au-dessus du sommet de',
      'home.cloudLayerTitle': 'Couche nuageuse vs sommet',
      'home.summitShort': 'Sommet',
      'home.cloudBaseShort': 'Base',
      'home.cloudLayerMargin': 'Marge verticale',
      'home.cloudLayerComfortable': 'Lecture simple: marge confortable pour passer au-dessus.',
      'home.cloudLayerTight': 'Lecture simple: la marge est faible ou nulle.',
      'home.cloudLayerAbove': 'Sommet au-dessus de la base nuageuse',
      'home.cloudLayerTouching': 'Base nuageuse au niveau du sommet',
    };
    return map[key] ?? key;
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'fr', toggleLocale: jest.fn() }),
}));

const viz = {
  summit_altitude: 2257,
  cloud_base: 1200,
  pressure_levels: [],
};

describe('cloud-layer-viz/DetailedCloudLayerViz', () => {
  it('rend la vue détaillée normale', () => {
    render(<DetailedCloudLayerViz viz={viz} isDark={false} />);
    expect(screen.getByTestId('cloud-layer-viz')).toBeTruthy();
    expect(screen.getByText('Couche nuageuse vs sommet')).toBeTruthy();
    expect(screen.getByText('Sommet')).toBeTruthy();
  });

  it('rend la vue sunny avec label de variante', () => {
    render(
      <DetailedCloudLayerViz
        viz={{ summit_altitude: 476, cloud_base: 5000, pressure_levels: [] }}
        isDark={false}
        isSunny
        variant="ridge"
        showVariantLabel
      />,
    );
    expect(screen.getByText('Dégagé')).toBeTruthy();
    expect(screen.getByText('Variant B')).toBeTruthy();
  });
});
