import { ScoreCard } from '@/components/ScoreCard';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ScoreResponse } from '@/services/mockData/types';

jest.mock('@/utils/i18n', () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      'score.none': 'Nuages au sol',
      'score.sunny': 'Ciel dégagé',
      'score.high': 'Lève-toi tôt !',
      'score.medium': 'Ça peut le faire',
      'score.low': 'Pas ce coup-ci',
      'home.cloudLayerAbove': 'Sommet au-dessus de la base nuageuse',
      'home.cloudLayerBelow': 'Base nuageuse au-dessus du sommet de',
      'home.cloudLayerTouching': 'Base nuageuse au niveau du sommet',
      'home.cloudLayerTitle': 'Couche nuageuse vs sommet',
      'home.summitShort': 'Sommet',
      'home.cloudBaseShort': 'Base',
      'home.cloudLayerMargin': 'Marge verticale',
      'home.cloudLayerComfortable': 'Lecture simple: marge confortable pour passer au-dessus.',
      'home.cloudLayerTight': 'Lecture simple: la marge est faible ou nulle.',
    };
    return map[key] ?? key;
  },
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ scheme: 'light' }),
}));

const makeScore = (overrides: Partial<ScoreResponse>): ScoreResponse => ({
  score: 84,
  verdict: 'high',
  cloud_base: 1200,
  peak_name: 'Mont Blanc',
  peak_altitude: 4808,
  conditions: {
    cloud_base_score: 0.9,
    humidity_score: 0.8,
    wind_score: 0.7,
    inversion_score: 0.6,
  },
  ...overrides,
});

describe('ScoreCard', () => {
  it('affiche_score_high_avec_couleur_verte', () => {
    render(<ScoreCard score={makeScore({ score: 84, verdict: 'high' })} date="2026-03-23" />);
    expect(screen.getByText('Lève-toi tôt ! 🟢')).toBeTruthy();
  });

  it('affiche_score_medium_avec_couleur_orange', () => {
    render(<ScoreCard score={makeScore({ score: 54, verdict: 'medium' })} date="2026-03-23" />);
    expect(screen.getByText('Ça peut le faire 🟡')).toBeTruthy();
  });

  it('affiche_score_low_avec_couleur_rouge', () => {
    render(<ScoreCard score={makeScore({ score: 22, verdict: 'low' })} date="2026-03-23" />);
    expect(screen.getByText('Pas ce coup-ci 🔴')).toBeTruthy();
  });

  it('affiche_nom_sommet', () => {
    render(<ScoreCard score={makeScore({ peak_name: 'Mont Blanc' })} date="2026-03-23" />);
    expect(screen.getByText('Mont Blanc')).toBeTruthy();
  });

  it('affiche_score_en_pourcentage', () => {
    render(<ScoreCard score={makeScore({ score: 84 })} date="2026-03-23" />);
    expect(screen.getByText('84')).toBeTruthy();
    expect(screen.getByText('%')).toBeTruthy();
  });

  it('affiche_le_container_avec_testID', () => {
    render(<ScoreCard score={makeScore({})} date="2026-03-23" />);
    expect(screen.getByTestId('score-card')).toBeTruthy();
  });

  it('affiche_score_none_avec_couleur_grise', () => {
    const score = makeScore({ score: 0, verdict: 'none' });
    render(<ScoreCard score={score} date="2026-03-23" />);
    expect(screen.getByText(/Nuages au sol/)).toBeTruthy();
  });

  it('affiche_score_sunny_quand_nuages_au_dessus_du_sommet', () => {
    const score = makeScore({ score: 0, verdict: 'none', cloud_base: 5000, peak_altitude: 476 });
    render(<ScoreCard score={score} date="2026-03-25" />);
    expect(screen.getByText('Ciel dégagé ☀️')).toBeTruthy();
  });

  it('affiche_date_brute_si_invalide', () => {
    render(<ScoreCard score={makeScore({})} date="invalid-date" />);
    expect(screen.getByText('invalid-date')).toBeTruthy();
  });

  it('affiche_date_brute_si_Date_lance_une_exception', () => {
    const OriginalDate = global.Date;
    // Make Date constructor throw to exercise the catch branch
    const MockDate = jest.fn().mockImplementation(() => { throw new Error('Date error'); }) as unknown as typeof Date;
    MockDate.now = OriginalDate.now;
    global.Date = MockDate;
    try {
      render(<ScoreCard score={makeScore({})} date="throw-date" />);
      expect(screen.getByText('throw-date')).toBeTruthy();
    } finally {
      global.Date = OriginalDate;
    }
  });

  it('affiche le message contextuel quand il est fourni', () => {
    render(
      <ScoreCard
        score={makeScore({})}
        date="2026-03-23"
        contextMessage="Pas de mer de nuage - mais ciel dégagé au-dessus de 2400m ☀️"
      />,
    );

    expect(screen.getByText('Pas de mer de nuage - mais ciel dégagé au-dessus de 2400m ☀️')).toBeTruthy();
  });

  it('affiche les chips d\'heure quand onSelectHour est fourni', () => {
    const mockOnSelectHour = jest.fn();
    render(
      <ScoreCard
        score={makeScore({ score: 84, verdict: 'high' })}
        date="2026-03-23"
        selectedHour={8}
        onSelectHour={mockOnSelectHour}
      />,
    );
    expect(screen.getByText('08h')).toBeTruthy(); // chip actif
    expect(screen.getByText('06h')).toBeTruthy();
    fireEvent.press(screen.getByText('06h'));
    expect(mockOnSelectHour).toHaveBeenCalledWith(6);
  });

  it('n\'affiche pas les chips d\'heure sans onSelectHour', () => {
    render(<ScoreCard score={makeScore({})} date="2026-03-23" />);
    expect(screen.queryByText('08h')).toBeNull();
  });
});
