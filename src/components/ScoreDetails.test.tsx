import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ScoreDetails } from '@/components/ScoreDetails';
import type { ScoreResponse } from '@/services/mockData/types';

jest.mock('@/utils/i18n', () => ({
  t: (key: string, params?: Record<string, string | number>) => {
    const map: Record<string, string> = {
      'home.optimalWindow': 'Fenêtre',
      'home.sunrise': '☀️ Lever du soleil',
      'home.windowUnavailable': 'À confirmer',
      'home.conditionsTitle': 'Conditions météo',
      'home.cloudBase': 'Base nuageuse',
      'home.humidity': 'Humidité',
      'home.wind': 'Vent',
      'home.inversion': 'Inversion',
      'home.stabilityTitle': 'Stabilité',
      'home.stabilityStrong': `Prévision stable depuis ${params?.hours ?? '?'}h ✓`,
      'home.stabilityMedium': `Prévision encore évolutive, stable depuis ${params?.hours ?? '?'}h`,
      'home.stabilityWeak': 'À reconfirmer ce soir ⚠',
      'home.stabilityUnknown': 'Stabilité en cours de calcul',
      'home.cloudLayerTitle': 'Couche nuageuse vs sommet',
      'home.summitShort': 'Sommet',
      'home.cloudBaseShort': 'Base',
    };
    return map[key] ?? key;
  },
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ scheme: 'light' }),
}));

const makeScore = (overrides: Partial<ScoreResponse> = {}): ScoreResponse => ({
  score: 84,
  verdict: 'high',
  label: 'Fenetre optimale',
  cloud_base: 1200,
  peak_name: 'Mont Blanc',
  peak_altitude: 4808,
  optimal_window_start: '06:40',
  optimal_window_end: '08:15',
  sunrise: '07:02',
  stability_hours: 48,
  conditions: {
    cloud_base_score: 0.9,
    humidity_score: 0.8,
    wind_score: 0.7,
    inversion_score: 0.6,
    pressure_score: 0.7,
    humidity: 86,
    wind_speed: 7,
    inversion_present: true,
  },
  cloud_layer_viz: {
    summit_altitude: 4808,
    cloud_base: 1200,
    pressure_levels: [
      { pressure_hpa: 925, altitude_m: 730, relative_humidity: 92, temperature_c: 8.3 },
    ],
  },
  ...overrides,
});

describe('ScoreDetails', () => {
  it('affiche les détails riches et la viz', () => {
    render(<ScoreDetails score={makeScore()} />);

    expect(screen.getByTestId('score-details')).toBeTruthy();
    expect(screen.getByText('06:40-08:15')).toBeTruthy();
    expect(screen.getByText('07:02')).toBeTruthy();
    expect(screen.getByText('86%')).toBeTruthy();
    expect(screen.getByText('7 km/h')).toBeTruthy();
    expect(screen.getByText('Oui')).toBeTruthy();
    expect(screen.getByTestId('cloud-layer-viz')).toBeTruthy();
  });

  it('affiche les fallbacks quand les données 3.5 sont absentes', () => {
    render(
      <ScoreDetails
        score={makeScore({
          optimal_window_start: null,
          optimal_window_end: null,
          sunrise: null,
          stability_hours: null,
          conditions: {
            cloud_base_score: 0.1,
            humidity_score: 0.1,
            wind_score: 0.1,
            inversion_score: 0.1,
          },
          cloud_layer_viz: null,
        })}
      />,
    );

    expect(screen.getAllByText('À confirmer')).toHaveLength(2);
    expect(screen.getAllByText('N/A')).toHaveLength(3);
    expect(screen.getByText('Stabilité en cours de calcul')).toBeTruthy();
    expect(screen.queryByTestId('cloud-layer-viz')).toBeNull();
  });

  it('affiche le message de stabilité faible', () => {
    render(<ScoreDetails score={makeScore({ stability_hours: 8, cloud_layer_viz: null })} />);
    expect(screen.getByText('À reconfirmer ce soir ⚠')).toBeTruthy();
  });

  it('affiche le message de stabilité moyenne', () => {
    render(<ScoreDetails score={makeScore({ stability_hours: 18, cloud_layer_viz: null })} />);
    expect(screen.getByText('Prévision encore évolutive, stable depuis 18h')).toBeTruthy();
  });

  it('affiche "Non" quand aucune inversion n’est détectée', () => {
    render(
      <ScoreDetails
        score={makeScore({
          cloud_layer_viz: null,
          conditions: {
            cloud_base_score: 0.4,
            humidity_score: 0.4,
            wind_score: 0.4,
            inversion_score: 0.2,
            inversion_present: false,
          },
        })}
      />,
    );

    expect(screen.getByText('Non')).toBeTruthy();
  });
});
