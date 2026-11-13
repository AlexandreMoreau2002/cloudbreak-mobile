import React from 'react';
import { Alert } from 'react-native';
import type { ScoreResponse } from '@/services/mockData/types';
import { ConditionsSection } from '@/components/conditions-section';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('@/utils/i18n', () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      'home.conditionsTitle': 'Conditions météo',
      'home.humidity': 'Humidité',
      'home.wind': 'Vent',
      'home.inversion': 'Inversion',
      'home.alertCtaTitle': 'Activer une alerte',
      'home.alertCtaSubtitle': 'Préviens-moi si le score évolue',
      'home.alertCtaButton': 'Activer',
    };
    return map[key] ?? key;
  },
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textPrimary: '#111',
      textSecondary: '#666',
      surface: '#fff',
      border: '#ddd',
      accent: '#b28c6e',
    },
    typography: {
      fontFamily: { semiBold: 'semiBold', regular: 'regular' },
      fontSize: { xs: 12, sm: 14 },
    },
  }),
}));

const makeScore = (overrides: Partial<ScoreResponse> = {}): ScoreResponse => ({
  score: 52,
  verdict: 'medium',
  label: 'Moyenne',
  cloud_base: 1400,
  peak_name: 'Mont Blanc',
  peak_altitude: 4807,
  conditions: {
    cloud_base_score: 0.5,
    humidity_score: 0.5,
    wind_score: 0.5,
    inversion_score: 0.5,
    humidity: 100,
    wind_speed: 32,
    inversion_present: false,
  },
  ...overrides,
});

describe('ConditionsSection', () => {
  it('affiche les widgets météo', () => {
    render(<ConditionsSection score={makeScore()} />);
    expect(screen.getByText('CONDITIONS MÉTÉO')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('32 km/h')).toBeTruthy();
    expect(screen.getByText('Non')).toBeTruthy();
  });

  it('affiche N/A quand les valeurs manquent', () => {
    render(
      <ConditionsSection
        score={makeScore({
          conditions: {
            cloud_base_score: 0,
            humidity_score: 0,
            wind_score: 0,
            inversion_score: 0,
          },
        })}
      />,
    );
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  it('affiche le CTA d’alerte pour medium et déclenche Alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    render(<ConditionsSection score={makeScore({ verdict: 'medium' })} />);
    fireEvent.press(screen.getByText('ACTIVER'));
    expect(alertSpy).toHaveBeenCalledWith('Activer une alerte', 'Préviens-moi si le score évolue');
    alertSpy.mockRestore();
  });

  it('n’affiche pas le CTA d’alerte pour low', () => {
    render(<ConditionsSection score={makeScore({ verdict: 'low' })} />);
    expect(screen.queryByText('ACTIVER')).toBeNull();
  });
});
