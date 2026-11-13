/**
 * ValidationBottomSheet — tests unitaires.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ValidationBottomSheet } from './ValidationBottomSheet';

let mockScheme: 'light' | 'dark' = 'light';

jest.mock('@/utils/i18n', () => ({
  t: (key: string, options?: Record<string, string | number>) => {
    const map: Record<string, string> = {
      'terrain.searchingTitle': 'Confirmation terrain',
      'terrain.searchingBody': 'Localisation en cours…',
      'terrain.gpsConfirmed': 'Position confirmée · %{peak}',
      'terrain.gpsUnavailable': 'Position non disponible',
      'terrain.forecastRecall': 'Hier soir, la prévision annonçait %{score}% (%{verdict}) · %{peak}',
      'terrain.question': 'As-tu vu la mer de nuages ?',
      'terrain.answerYes': 'Oui',
      'terrain.answerNo': 'Non',
      'terrain.later': 'Plus tard',
      'terrain.deniedTitle': "On n'a pas pu te localiser",
      'terrain.deniedBody': 'Pas de souci — tu peux valider ta présence toi-même, sans position.',
      'terrain.validateManually': 'Valider manuellement',
      'terrain.successTitle': 'Merci !',
      'terrain.successBody': 'Ta validation aide à affiner les prévisions',
      'terrain.close': 'Fermer',
      'score.label.none': 'Pas de nuages',
      'score.label.high': 'Élevée',
      'score.label.medium': 'Moyenne',
      'score.label.low': 'Faible',
    };
    let template = map[key] ?? key;
    if (options) {
      Object.entries(options).forEach(([k, v]) => {
        template = template.replace(`%{${k}}`, String(v));
      });
    }
    return template;
  },
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

const baseProps = {
  visible: true,
  step: 'ready' as const,
  noGps: false,
  peakName: 'Mont Blanc',
  score: 82,
  verdict: 'high' as const,
  onAnswer: jest.fn(),
  onValidateManually: jest.fn(),
  onDismiss: jest.fn(),
};

describe('ValidationBottomSheet', () => {
  beforeEach(() => {
    mockScheme = 'light';
  });

  it('affiche le spinner de recherche au step searching', () => {
    const { getByTestId } = render(<ValidationBottomSheet {...baseProps} step="searching" />);
    expect(getByTestId('terrain-searching')).toBeTruthy();
  });

  it('affiche la question et les 2 boutons au step ready', () => {
    const { getByTestId } = render(<ValidationBottomSheet {...baseProps} step="ready" />);
    expect(getByTestId('terrain-answer-yes')).toBeTruthy();
    expect(getByTestId('terrain-answer-no')).toBeTruthy();
  });

  it('appelle onAnswer(true) au clic sur Oui', () => {
    const onAnswer = jest.fn();
    const { getByTestId } = render(<ValidationBottomSheet {...baseProps} step="ready" onAnswer={onAnswer} />);
    fireEvent.press(getByTestId('terrain-answer-yes'));
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('appelle onAnswer(false) au clic sur Non', () => {
    const onAnswer = jest.fn();
    const { getByTestId } = render(<ValidationBottomSheet {...baseProps} step="ready" onAnswer={onAnswer} />);
    fireEvent.press(getByTestId('terrain-answer-no'));
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it('masque la pill GPS quand noGps est vrai', () => {
    const { queryByTestId } = render(<ValidationBottomSheet {...baseProps} step="ready" noGps />);
    expect(queryByTestId('terrain-gps-pill')).toBeNull();
  });

  it('step denied affiche le CTA valider manuellement', () => {
    const onValidateManually = jest.fn();
    const { getByTestId } = render(
      <ValidationBottomSheet {...baseProps} step="denied" onValidateManually={onValidateManually} />,
    );
    fireEvent.press(getByTestId('terrain-validate-manually'));
    expect(onValidateManually).toHaveBeenCalled();
  });

  it('step success affiche le CTA fermer', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(<ValidationBottomSheet {...baseProps} step="success" onDismiss={onDismiss} />);
    fireEvent.press(getByTestId('terrain-close'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('désactive les boutons Oui/Non quand submitting est vrai', () => {
    const { getByTestId } = render(<ValidationBottomSheet {...baseProps} step="ready" submitting />);
    expect(getByTestId('terrain-answer-yes').props.accessibilityState?.disabled).toBe(true);
    expect(getByTestId('terrain-answer-no').props.accessibilityState?.disabled).toBe(true);
  });

  it('utilise les couleurs du thème sombre', () => {
    mockScheme = 'dark';
    const { getByTestId } = render(<ValidationBottomSheet {...baseProps} step="ready" />);
    expect(getByTestId('terrain-sheet')).toBeTruthy();
  });

  it("n'affiche rien quand step est null", () => {
    const { queryByTestId } = render(<ValidationBottomSheet {...baseProps} step={null} />);
    expect(queryByTestId('terrain-sheet')).toBeNull();
  });
});
