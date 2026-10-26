/**
 * ScoreWhySheet — tests unitaires.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { ScoreResponse } from '@/services/mockData/types';
import { ScoreWhySheet } from './ScoreWhySheet';

let mockScheme: 'light' | 'dark' = 'light';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('@/utils/i18n', () => ({
  t: (key: string, options?: Record<string, string | number>) =>
    options ? `${key}|${Object.entries(options).map(([k, v]) => `${k}=${v}`).join(',')}` : key,
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    scheme: mockScheme,
    colors: {
      background: '#EFE8DC',
      surface: '#F7F5F1',
      border: '#E9E4DA',
      accent: '#B28C6E',
      accentSecondary: '#D2BA9C',
      textPrimary: '#1A1A1A',
      textSecondary: '#5E5E5E',
      textDisabled: '#A0A0A0',
    },
  }),
}));

function makeScore(conditions: Partial<ScoreResponse['conditions']> = {}): ScoreResponse {
  return {
    score: 82,
    verdict: 'high',
    cloud_base: 1800,
    peak_name: 'Test',
    peak_altitude: 2000,
    conditions: {
      cloud_base_score: 1,
      humidity_score: 1,
      wind_score: 1,
      inversion_score: 1,
      inversion_delta_c: 6,
      wind_speed_kmh: 12,
      humidity_pct: 94,
      ...conditions,
    },
  };
}

describe('ScoreWhySheet', () => {
  beforeEach(() => {
    mockScheme = 'light';
  });

  it('affiche eyebrow, titre, 4 lignes et le bloc prudence', () => {
    const { getByText, getByTestId } = render(<ScoreWhySheet visible score={makeScore()} onDismiss={jest.fn()} />);
    expect(getByTestId('score-why-sheet')).toBeTruthy();
    expect(getByText('scoreWhy.eyebrow')).toBeTruthy();
    expect(getByText('scoreWhy.title|score=82')).toBeTruthy();
    ['inversion', 'clouds', 'wind', 'humidity'].forEach((k) => expect(getByTestId(`score-why-row-${k}`)).toBeTruthy());
    expect(getByTestId('score-why-caution')).toBeTruthy();
    expect(getByText('scoreWhy.cautionBold')).toBeTruthy();
  });

  it('formate les valeurs', () => {
    const { getByText } = render(<ScoreWhySheet visible score={makeScore()} onDismiss={jest.fn()} />);
    expect(getByText('+6 °C')).toBeTruthy();
    expect(getByText('1800 m · 2000 m')).toBeTruthy();
    expect(getByText('12 km/h')).toBeTruthy();
    expect(getByText('94 %')).toBeTruthy();
  });

  it('affiche une inversion négative sans plus et les décimales', () => {
    const { getByText } = render(
      <ScoreWhySheet visible score={makeScore({ inversion_delta_c: -2.5, wind_speed_kmh: 8.5 })} onDismiss={jest.fn()} />,
    );
    expect(getByText('-2.5 °C')).toBeTruthy();
    expect(getByText('8.5 km/h')).toBeTruthy();
  });

  it('affiche « — » et statut unknown quand la donnée manque', () => {
    const score = makeScore({ inversion_delta_c: null, wind_speed_kmh: null, humidity_pct: null });
    const { getAllByText, getByTestId, getByText } = render(<ScoreWhySheet visible score={score} onDismiss={jest.fn()} />);
    expect(getAllByText('—')).toHaveLength(3);
    expect(getByText('scoreWhy.wind.unknown')).toBeTruthy();
    expect(getByTestId('score-why-row-wind').props.accessibilityLabel).toContain('status=scoreWhy.status.unknown');
  });

  it('affiche « — » pour les nuages si la base est absente', () => {
    const score = { ...makeScore(), cloud_base: undefined as unknown as number };
    const { getAllByText } = render(<ScoreWhySheet visible score={score} onDismiss={jest.fn()} />);
    expect(getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('phrase et accessibilityLabel dépendent du statut', () => {
    const { getByText, getByTestId } = render(<ScoreWhySheet visible score={makeScore()} onDismiss={jest.fn()} />);
    expect(getByText('scoreWhy.inversion.high')).toBeTruthy();
    expect(getByText('scoreWhy.wind.medium')).toBeTruthy();
    const label = getByTestId('score-why-row-humidity').props.accessibilityLabel as string;
    expect(label).toContain('value=94 %');
    expect(label).toContain('status=scoreWhy.status.high');
  });

  it('ferme au tap sur le scrim et sur onRequestClose', () => {
    const onDismiss = jest.fn();
    const { getByTestId, UNSAFE_getByType } = render(<ScoreWhySheet visible score={makeScore()} onDismiss={onDismiss} />);
    fireEvent.press(getByTestId('score-why-overlay'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Modal } = require('react-native');
    UNSAFE_getByType(Modal).props.onRequestClose();
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it('se masque puis se réaffiche (reset des animations)', () => {
    const score = makeScore();
    const { rerender, queryByTestId } = render(<ScoreWhySheet visible score={score} onDismiss={jest.fn()} />);
    rerender(<ScoreWhySheet visible={false} score={score} onDismiss={jest.fn()} />);
    expect(queryByTestId('score-why-sheet')).toBeNull();
    rerender(<ScoreWhySheet visible score={score} onDismiss={jest.fn()} />);
    expect(queryByTestId('score-why-sheet')).toBeTruthy();
  });

  it('fonctionne en mode sombre', () => {
    mockScheme = 'dark';
    const { getByTestId } = render(<ScoreWhySheet visible score={makeScore()} onDismiss={jest.fn()} />);
    expect(getByTestId('score-why-sheet')).toBeTruthy();
  });
});
