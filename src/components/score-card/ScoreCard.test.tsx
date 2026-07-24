import type { ScoreResponse } from '@/services/mockData/types';
import { __private__, ScoreCard } from '@/components/score-card';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockTrack = jest.fn();
jest.mock('@/services/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

let mockScheme: 'light' | 'dark' = 'light';

const translate = (key: string) => {
  const map: Record<string, string> = {
    'score.label.none': 'Pas de nuages',
    'score.label.high': 'Élevée',
    'score.label.medium': 'Moyenne',
    'score.label.low': 'Faible',
    'score.none': 'Pas de nuages',
    'score.sunny': 'Dégagé',
    'score.high': 'Élevée',
    'score.medium': 'Moyenne',
    'score.low': 'Faible',
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
};

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string) => translate(key)),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ scheme: mockScheme }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'fr', toggleLocale: jest.fn() }),
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
  beforeEach(() => {
    mockScheme = 'light';
    mockTrack.mockClear();
    (jest.requireMock('@/utils/i18n') as { t: jest.Mock }).t.mockImplementation((key: string) => translate(key));
  });

  it('affiche_score_high_avec_couleur_verte', () => {
    render(<ScoreCard score={makeScore({ score: 84, verdict: 'high' })} date="2026-03-23" />);
    expect(screen.getByText('ÉLEVÉE')).toBeTruthy();
  });

  it('utilise le label fourni par l_api quand il est present', () => {
    render(
      <ScoreCard
        score={makeScore({ verdict: 'high', label: 'Élevée API' })}
        date="2026-03-23"
      />,
    );
    expect(screen.getByText('ÉLEVÉE API')).toBeTruthy();
  });

  it('utilise le fallback des labels quand score.label.high nest pas traduit', () => {
    const i18nMock = jest.requireMock('@/utils/i18n') as { t: jest.Mock };
    i18nMock.t.mockImplementation((key: string) => (key === 'score.label.high' ? key : translate(key)));

    render(<ScoreCard score={makeScore({ verdict: 'high', label: undefined })} date="2026-03-23" />);

    expect(screen.getByText('ÉLEVÉE')).toBeTruthy();
  });

  it('affiche_score_medium_avec_couleur_orange', () => {
    render(<ScoreCard score={makeScore({ score: 54, verdict: 'medium' })} date="2026-03-23" />);
    expect(screen.getByText('MOYENNE')).toBeTruthy();
  });

  it('affiche_score_low_avec_couleur_rouge', () => {
    render(<ScoreCard score={makeScore({ score: 22, verdict: 'low' })} date="2026-03-23" />);
    expect(screen.getByText('FAIBLE')).toBeTruthy();
  });

  it('n_affiche_pas_le_nom_sommet_dans_la_card', () => {
    render(<ScoreCard score={makeScore({ peak_name: 'Mont Blanc' })} date="2026-03-23" />);
    expect(screen.queryByText('Mont Blanc')).toBeNull();
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
    expect(screen.getByText('PAS DE NUAGES')).toBeTruthy();
  });

  it('affiche_score_sunny_quand_nuages_au_dessus_du_sommet', () => {
    const score = makeScore({ score: 0, verdict: 'none', cloud_base: 5000, peak_altitude: 476 });
    render(<ScoreCard score={score} date="2026-03-25" />);
    expect(screen.getByText('DÉGAGÉ')).toBeTruthy();
  });


  it('affiche le message contextuel quand il est fourni', () => {
    render(
      <ScoreCard
        score={makeScore({})}
        date="2026-03-23"
        contextMessage="Pas de nuages, ciel parfaitement dégagé au-dessus de 2400m ☀️"
      />,
    );

    expect(screen.getByText('Pas de nuages, ciel parfaitement dégagé au-dessus de 2400m ☀️')).toBeTruthy();
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
    expect(mockTrack).toHaveBeenCalledWith('score_hour_changed', { hour: 6, verdict: 'high' });
  });

  it('n\'affiche pas les chips d\'heure sans onSelectHour', () => {
    render(<ScoreCard score={makeScore({})} date="2026-03-23" />);
    expect(screen.queryByText('08h')).toBeNull();
  });

  it('n affiche pas le message contextuel quand il est vide apres trim', () => {
    render(
      <ScoreCard
        score={makeScore({ cloud_layer_viz: null })}
        date="2026-03-23"
        contextMessage="   "
      />,
    );

    expect(screen.queryByText('   ')).toBeNull();
    expect(screen.getByTestId('score-card')).toBeTruthy();
  });

  it('reste lisible en theme dark avec la viz de fallback', () => {
    mockScheme = 'dark';
    render(<ScoreCard score={makeScore({ cloud_layer_viz: null, verdict: 'none', cloud_base: 800 })} date="2026-03-23" />);
    expect(screen.getByText('PAS DE NUAGES')).toBeTruthy();
  });

  it('utilise la variante compacte ridge pour un score medium', () => {
    expect(__private__.getCompactVizVariant(makeScore({ verdict: 'medium' }))).toBe('ridge');
  });

  it("n'affiche pas le bouton validation terrain sans la prop onValidateTerrain", () => {
    render(<ScoreCard score={makeScore({})} date="2026-03-23" />);
    expect(screen.queryByTestId('validate-terrain-button')).toBeNull();
  });

  it('affiche le bouton validation terrain quand onValidateTerrain est fourni', () => {
    const onValidateTerrain = jest.fn();
    render(<ScoreCard score={makeScore({})} date="2026-03-23" onValidateTerrain={onValidateTerrain} />);
    fireEvent.press(screen.getByTestId('validate-terrain-button'));
    expect(onValidateTerrain).toHaveBeenCalled();
  });
});
