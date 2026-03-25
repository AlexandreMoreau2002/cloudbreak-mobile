import React from 'react';
import HomeScreen, { getShareForecastUrl, shareForecast } from '@/app/(tabs)/index';
import type { ScoreResponse } from '@/services/mockData/types';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';

// --- Mocks ---

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  Href: {},
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('@/utils/i18n', () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      'home.title': 'CLOUDBREAK',
      'home.selectPeak': 'Choisissez un sommet',
      'home.selectPeakHint': 'Recherchez un sommet pour voir la prévision',
      'home.goToSearch': 'Rechercher un sommet',
      'home.serviceUnavailable': 'Service momentanément indisponible',
      'home.errorGeneric': 'Impossible de charger la prévision',
      'home.shareForecast': 'Partager la prévision',
      'home.shareFailedTitle': 'Partage indisponible',
      'home.optimalWindow': 'Fenêtre',
      'home.sunrise': '☀️ Lever du soleil',
      'home.windowUnavailable': 'À confirmer',
      'home.conditionsTitle': 'Conditions météo',
      'home.cloudBase': 'Base nuageuse',
      'home.humidity': 'Humidité',
      'home.wind': 'Vent',
      'home.inversion': 'Inversion',
      'home.stabilityTitle': 'Stabilité',
      'home.stabilityStrong': 'Prévision stable depuis %{hours}h ✓',
      'home.stabilityMedium': 'Prévision encore évolutive, stable depuis %{hours}h',
      'home.stabilityWeak': 'À reconfirmer ce soir ⚠',
      'home.stabilityUnknown': 'Stabilité en cours de calcul',
      'home.alertCtaTitle': 'Activer une alerte',
      'home.alertCtaSubtitle': 'Préviens-moi si le score évolue sur ce sommet',
      'home.alertCtaButton': 'Activer',
      'home.cloudLayerTitle': 'Couche nuageuse vs sommet',
      'home.summitShort': 'Sommet',
      'home.cloudBaseShort': 'Base',
      'home.searchPlaceholder': 'Rechercher un sommet...',
      'home.sectionFavorites': 'Favoris',
      'score.none': 'Nuages au sol',
      'score.high': 'Lève-toi tôt !',
      'score.medium': 'Ça peut le faire',
      'score.low': 'Pas ce coup-ci',
    };
    return map[key] ?? key;
  },
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#EFE8DC',
      surface: '#F7F5F1',
      border: '#E9E4DA',
      accent: '#B28C6E',
      accentSecondary: '#D2BA9C',
      textPrimary: '#1A1A1A',
      textSecondary: '#5E5E5E',
      textDisabled: '#9E9E9E',
    },
    typography: {
      fontFamily: { regular: 'Josefin Sans', semiBold: 'Josefin Sans', bold: 'Josefin Sans' },
      fontSize: { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, hero: 72 },
      lineHeight: { tight: 1.1 },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    radius: { sm: 8, full: 999 },
  }),
}));

const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseSelectedPeak = jest.fn();
jest.mock('@/contexts/SelectedPeakContext', () => ({
  useSelectedPeak: () => mockUseSelectedPeak(),
}));

const mockUseScore = jest.fn();
jest.mock('@/hooks/useScore', () => ({
  useScore: () => mockUseScore(),
}));

const mockUseFavorites = jest.fn();
jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => mockUseFavorites(),
}));

jest.mock('@/hooks/useWeekScores', () => ({
  useWeekScores: () => null,
}));

// --- Shared defaults ---

const DEFAULT_PEAK = {
  id: 'peak-1',
  name: 'Mont Blanc',
  slug: 'mont-blanc',
  lat: 45.8326,
  lng: 6.8652,
  altitude: 4808,
};

const mockSetSelectedDate = jest.fn();

const MOCK_SCORE_DATA: ScoreResponse = {
  score: 84,
  verdict: 'high',
  label: 'Fenetre optimale',
  cloud_base: 1200,
  peak_name: 'Mont Blanc',
  peak_altitude: 4808,
  peak_slug: 'mont-blanc',
  context_message: 'Pas de mer de nuage - mais ciel parfaitement dégagé au-dessus de 2400m ☀️',
  optimal_window_start: '06:40',
  optimal_window_end: '08:15',
  sunrise: '07:02',
  stability_hours: 48,
  conditions: {
    cloud_base_score: 0.9,
    humidity_score: 0.8,
    wind_score: 0.7,
    inversion_score: 0.6,
    pressure_score: 0.75,
    cloud_base_m: 1200,
    humidity: 86,
    wind_speed: 7,
    inversion_delta: 4.8,
    inversion_present: true,
    pressure_hpa: 1028,
  },
  cloud_layer_viz: {
    summit_altitude: 4808,
    cloud_base: 1200,
    pressure_levels: [
      { pressure_hpa: 925, altitude_m: 730, relative_humidity: 92, temperature_c: 8.3 },
    ],
  },
};

// --- Tests ---

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-03-24T08:00:00Z'));
    mockPush.mockReset();
    mockSetSelectedDate.mockReset();
    mockUseAuth.mockReturnValue({ session: { access_token: 'mock-token' }, loading: false });
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: null,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'idle' });
    mockUseFavorites.mockReturnValue({
      state: { status: 'success', data: [] },
      addFavorite: jest.fn(),
      removeFavorite: jest.fn(),
      refresh: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('affiche_invite_si_pas_de_sommet_selectionne', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Choisissez un sommet')).toBeTruthy();
  });

  it('utilise_null_comme_token_si_session_absente', () => {
    mockUseAuth.mockReturnValue({ session: null, loading: false });
    render(<HomeScreen />);
    expect(screen.getByText('Choisissez un sommet')).toBeTruthy();
  });

  it('tolere un etat favoris non resolu sans afficher la section favoris', () => {
    mockUseFavorites.mockReturnValue({
      state: { status: 'loading', data: null },
      addFavorite: jest.fn(),
      removeFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    render(<HomeScreen />);

    expect(screen.queryByText('FAVORIS')).toBeNull();
    expect(screen.getByText('Choisissez un sommet')).toBeTruthy();
  });

  it('affiche_skeleton_pendant_chargement', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'loading' });

    render(<HomeScreen />);
    expect(screen.getByTestId('score-skeleton')).toBeTruthy();
    // WeekStrip n'est plus affiché en état loading
    expect(screen.queryByTestId('week-strip')).toBeNull();
  });

  it('affiche_scorecard_en_succes', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'success', data: MOCK_SCORE_DATA });

    render(<HomeScreen />);
    expect(screen.getByTestId('score-card')).toBeTruthy();
    expect(screen.getByText('Pas de mer de nuage - mais ciel parfaitement dégagé au-dessus de 2400m ☀️')).toBeTruthy();
    expect(screen.getByTestId('week-strip')).toBeTruthy();
    expect(screen.getByText('Activer une alerte')).toBeTruthy();
  });

  it('affiche_erreur_si_api_echoue', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'error', error: 'Erreur de chargement' });

    render(<HomeScreen />);
    expect(screen.getByText('Impossible de charger la prévision')).toBeTruthy();
  });

  it('affiche_service_indisponible_si_erreur_503', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'error', error: 'Service momentanément indisponible' });

    render(<HomeScreen />);
    expect(screen.getByText('Service momentanément indisponible')).toBeTruthy();
  });

  it('navigue_vers_recherche_au_tap_sur_cta', () => {
    render(<HomeScreen />);
    fireEvent.press(screen.getByText('Rechercher un sommet'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/search');
  });

  it('navigue_vers_recherche_au_tap_sur_barre_de_recherche', () => {
    render(<HomeScreen />);
    fireEvent.press(screen.getByText('Rechercher un sommet...'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/search');
  });

  it('retourne_null_si_sommet_selectionne_et_etat_idle', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'idle' });

    render(<HomeScreen />);
    // No scorecard, no skeleton, no error — renders empty content
    expect(screen.queryByTestId('score-card')).toBeNull();
    expect(screen.queryByTestId('score-skeleton')).toBeNull();
  });

  it('affiche les widgets meteo en succes', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'success', data: MOCK_SCORE_DATA });

    render(<HomeScreen />);
    expect(screen.getByTestId('score-card')).toBeTruthy();
    // Les labels des widgets (uppercase via JS)
    expect(screen.getByText('HUMIDITÉ')).toBeTruthy();
    expect(screen.getByText('VENT')).toBeTruthy();
    expect(screen.getByText('INVERSION')).toBeTruthy();
    // Les valeurs
    expect(screen.getByText('86%')).toBeTruthy();
    expect(screen.getByText('7 km/h')).toBeTruthy();
    expect(screen.getByText('Oui')).toBeTruthy();
  });

  it('garde le dernier score visible pendant un refresh du meme sommet', () => {
    const states: ({ status: 'success'; data: ScoreResponse } | { status: 'loading' })[] = [
      { status: 'success', data: MOCK_SCORE_DATA },
      { status: 'loading' },
    ];
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockImplementation(() => states.shift() ?? { status: 'loading' });

    const { rerender } = render(<HomeScreen />);
    expect(screen.getByText('Pas de mer de nuage - mais ciel parfaitement dégagé au-dessus de 2400m ☀️')).toBeTruthy();

    rerender(<HomeScreen />);

    expect(screen.getByTestId('score-card')).toBeTruthy();
    expect(screen.queryByTestId('score-skeleton')).toBeNull();
  });

  it('affiche la section favoris si des favoris existent', () => {
    mockUseFavorites.mockReturnValue({
      state: { status: 'success', data: [{ id: 'fav-1', name: 'Moucherotte', slug: 'moucherotte', lat: 45.1, lng: 5.6, altitude: 1901 }] },
      addFavorite: jest.fn(),
      removeFavorite: jest.fn(),
      refresh: jest.fn(),
    });
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'success', data: MOCK_SCORE_DATA });

    render(<HomeScreen />);
    expect(screen.getByText('FAVORIS')).toBeTruthy();
    expect(screen.getByText('Moucherotte')).toBeTruthy();
    expect(screen.getByText('1901 m')).toBeTruthy();
  });

  it('ajoute le sommet courant aux favoris quand il n est pas encore favori', () => {
    const addFavorite = jest.fn();
    mockUseFavorites.mockReturnValue({
      state: { status: 'success', data: [] },
      addFavorite,
      removeFavorite: jest.fn(),
      refresh: jest.fn(),
    });
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'success', data: MOCK_SCORE_DATA });

    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId('favorite-toggle-button'));

    expect(addFavorite).toHaveBeenCalledWith('peak-1');
  });

  it('retire le sommet courant des favoris quand il est deja favori', () => {
    const removeFavorite = jest.fn();
    mockUseFavorites.mockReturnValue({
      state: { status: 'success', data: [{ ...DEFAULT_PEAK }] },
      addFavorite: jest.fn(),
      removeFavorite,
      refresh: jest.fn(),
    });
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'success', data: MOCK_SCORE_DATA });

    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId('favorite-toggle-button'));

    expect(removeFavorite).toHaveBeenCalledWith('peak-1');
  });

  it('active le CTA alerte pour un score favorable', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'success', data: MOCK_SCORE_DATA });

    render(<HomeScreen />);
    fireEvent.press(screen.getByText('ACTIVER'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Activer une alerte',
      'Préviens-moi si le score évolue sur ce sommet',
    );
    alertSpy.mockRestore();
  });

  it('utilise les champs legacy des conditions et masque le CTA alerte pour un score low', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({
      status: 'success',
      data: {
        ...MOCK_SCORE_DATA,
        verdict: 'low',
        conditions: {
          cloud_base_score: 0.5,
          humidity_score: 0.5,
          wind_score: 0.4,
          inversion_score: 0.3,
          humidity_pct: 61,
          wind_speed_kmh: 14,
          inversion_detected: false,
        },
      },
    });

    render(<HomeScreen />);

    expect(screen.getByText('61%')).toBeTruthy();
    expect(screen.getByText('14 km/h')).toBeTruthy();
    expect(screen.getByText('Non')).toBeTruthy();
    expect(screen.queryByText('ACTIVER')).toBeNull();
  });

  it('n affiche pas la section météo quand les conditions sont absentes', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({
      status: 'success',
      data: {
        ...MOCK_SCORE_DATA,
        conditions: null,
      },
    });

    render(<HomeScreen />);

    expect(screen.queryByText('CONDITIONS MÉTÉO')).toBeNull();
    expect(screen.getByTestId('score-card')).toBeTruthy();
  });

  it('affiche N/A quand les conditions ne contiennent aucune valeur exploitable', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({
      status: 'success',
      data: {
        ...MOCK_SCORE_DATA,
        verdict: 'low',
        conditions: {
          cloud_base_score: 0.2,
          humidity_score: 0.2,
          wind_score: 0.2,
          inversion_score: 0.2,
        },
      },
    });

    render(<HomeScreen />);

    expect(screen.getAllByText('N/A')).toHaveLength(3);
    expect(screen.queryByText('ACTIVER')).toBeNull();
  });

  it('sélectionne un favori depuis la grille', () => {
    const setSelectedPeak = jest.fn();
    mockUseFavorites.mockReturnValue({
      state: { status: 'success', data: [{ id: 'fav-1', name: 'Moucherotte', slug: 'moucherotte', lat: 45.1, lng: 5.6, altitude: 1901 }] },
      addFavorite: jest.fn(),
      removeFavorite: jest.fn(),
      refresh: jest.fn(),
    });
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak,
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'success', data: MOCK_SCORE_DATA });

    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId('favorite-peak-fav-1'));

    expect(setSelectedPeak).toHaveBeenCalledWith({
      id: 'fav-1',
      name: 'Moucherotte',
      slug: 'moucherotte',
      lat: 45.1,
      lng: 5.6,
      altitude: 1901,
    });
  });

  it('partage le lien de prévision avec le slug du sommet', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValueOnce({} as never);
    await shareForecast('mont-blanc');

    await waitFor(() =>
      expect(shareSpy).toHaveBeenCalledWith({
        message: 'https://merdenua.ge/sommet/mont-blanc',
        url: 'https://merdenua.ge/sommet/mont-blanc',
      }),
    );
    shareSpy.mockRestore();
  });

  it('retourne_null_si_le_slug_de_partage_est_absent', () => {
    expect(getShareForecastUrl(null)).toBeNull();
  });

  it('ignore le partage si aucun slug nest disponible', async () => {
    const shareSpy = jest.fn();
    const alertSpy = jest.fn();

    await shareForecast(null, shareSpy, alertSpy);

    expect(shareSpy).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("n'affiche pas le bouton share-forecast dans le nouveau layout", () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: { ...DEFAULT_PEAK, slug: undefined as unknown as string },
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({
      status: 'success',
      data: { ...MOCK_SCORE_DATA, peak_slug: undefined },
    });

    render(<HomeScreen />);
    // Le bouton share a été retiré du layout
    expect(screen.queryByTestId('share-forecast-button')).toBeNull();
  });

  it("affiche une alerte si le partage natif échoue", async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockRejectedValueOnce(new Error('no share'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await shareForecast('mont-blanc');

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Partage indisponible', 'https://merdenua.ge/sommet/mont-blanc'),
    );
    shareSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('change la date via le week strip', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'success', data: MOCK_SCORE_DATA });

    render(<HomeScreen />);
    fireEvent.press(screen.getByText('Mer.'));

    expect(mockSetSelectedDate).toHaveBeenCalledWith('2026-03-25');
  });

  it('ajoute le sommet courant aux favoris quand il ne lest pas encore', () => {
    const addFavorite = jest.fn();
    mockUseFavorites.mockReturnValue({
      state: { status: 'success', data: [] },
      addFavorite,
      removeFavorite: jest.fn(),
      refresh: jest.fn(),
    });
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'success', data: MOCK_SCORE_DATA });

    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId('favorite-toggle-button'));

    expect(addFavorite).toHaveBeenCalledWith('peak-1');
  });

  it('retire le sommet courant des favoris quand il est deja favori', () => {
    const removeFavorite = jest.fn();
    mockUseFavorites.mockReturnValue({
      state: { status: 'success', data: [DEFAULT_PEAK] },
      addFavorite: jest.fn(),
      removeFavorite,
      refresh: jest.fn(),
    });
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'success', data: MOCK_SCORE_DATA });

    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId('favorite-toggle-button'));

    expect(removeFavorite).toHaveBeenCalledWith('peak-1');
  });

  it('selectionne un favori depuis la section favoris', () => {
    const setSelectedPeak = jest.fn();
    mockUseFavorites.mockReturnValue({
      state: { status: 'success', data: [{ id: 'fav-1', name: 'Moucherotte', slug: 'moucherotte', lat: 45.1, lng: 5.6, altitude: 1901 }] },
      addFavorite: jest.fn(),
      removeFavorite: jest.fn(),
      refresh: jest.fn(),
    });
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak,
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'success', data: MOCK_SCORE_DATA });

    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId('favorite-peak-fav-1'));

    expect(setSelectedPeak).toHaveBeenCalledWith({
      id: 'fav-1',
      name: 'Moucherotte',
      slug: 'moucherotte',
      lat: 45.1,
      lng: 5.6,
      altitude: 1901,
    });
  });

  it('ouvre lalerte native depuis le CTA dalerte', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'success', data: MOCK_SCORE_DATA });

    render(<HomeScreen />);
    fireEvent.press(screen.getByText('ACTIVER'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Activer une alerte',
      'Préviens-moi si le score évolue sur ce sommet',
    );
    alertSpy.mockRestore();
  });

  it('masque la section conditions si le score n a pas de conditions', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({
      status: 'success',
      data: { ...MOCK_SCORE_DATA, conditions: null },
    });

    render(<HomeScreen />);
    expect(screen.queryByText('Conditions météo')).toBeNull();
  });

  it('traite les favoris null comme une liste vide', () => {
    mockUseFavorites.mockReturnValue({
      state: { status: 'success', data: null },
      addFavorite: jest.fn(),
      removeFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    render(<HomeScreen />);
    expect(screen.queryByText('FAVORIS')).toBeNull();
  });

  it('utilise les champs legacy des conditions quand ils sont fournis', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({
      status: 'success',
      data: {
        ...MOCK_SCORE_DATA,
        verdict: 'low',
        conditions: {
          cloud_base_score: 0.9,
          humidity_score: 0.8,
          wind_score: 0.7,
          inversion_score: 0.6,
          humidity: null,
          humidity_pct: 31,
          wind_speed: null,
          wind_speed_kmh: 12,
          inversion_present: null,
          inversion_detected: false,
        },
      },
    });

    render(<HomeScreen />);
    expect(screen.getByText('31%')).toBeTruthy();
    expect(screen.getByText('12 km/h')).toBeTruthy();
    expect(screen.getByText('Non')).toBeTruthy();
    expect(screen.queryByText('Activer une alerte')).toBeNull();
  });

  it('conserve le dernier score valide pendant un refresh du meme sommet', () => {
    let currentScoreState: ReturnType<typeof mockUseScore> = { status: 'success', data: MOCK_SCORE_DATA };
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockImplementation(() => currentScoreState);

    const { rerender } = render(<HomeScreen />);
    expect(screen.getByTestId('score-card')).toBeTruthy();

    currentScoreState = { status: 'loading' };
    rerender(<HomeScreen />);

    expect(screen.getByTestId('score-card')).toBeTruthy();
    expect(screen.queryByTestId('score-skeleton')).toBeNull();
  });

  it('n applique pas le cache stale au refresh dun autre sommet', () => {
    const alternatePeak = { ...DEFAULT_PEAK, id: 'peak-2', name: 'Aiguille Verte' };
    mockUseSelectedPeak
      .mockReturnValueOnce({
        selectedPeak: DEFAULT_PEAK,
        selectedDate: '2026-03-24',
        selectedHour: 6,
        setSelectedPeak: jest.fn(),
        setSelectedDate: mockSetSelectedDate,
        setSelectedHour: jest.fn(),
      })
      .mockReturnValue({
        selectedPeak: alternatePeak,
        selectedDate: '2026-03-24',
        selectedHour: 6,
        setSelectedPeak: jest.fn(),
        setSelectedDate: mockSetSelectedDate,
        setSelectedHour: jest.fn(),
      });

    let currentScoreState: ReturnType<typeof mockUseScore> = { status: 'success', data: MOCK_SCORE_DATA };
    mockUseScore.mockImplementation(() => currentScoreState);

    const { rerender } = render(<HomeScreen />);
    expect(screen.getByTestId('score-card')).toBeTruthy();

    currentScoreState = { status: 'loading' };
    rerender(<HomeScreen />);

    expect(screen.getByTestId('score-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('score-card')).toBeNull();
  });
});
