import React from 'react';
import { Alert, Share } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import type { WeekData } from '@/hooks/useWeekData';
import type { ScoreResponse } from '@/services/mockData/types';
import HomeScreen, { getShareForecastUrl, shareForecast } from '@/app/(tabs)/index';

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
      'home.today': "Aujourd'hui",
      'home.serviceUnavailable': 'Service momentanément indisponible',
      'home.errorGeneric': 'Impossible de charger la prévision',
      'home.quotaUpgrade': 'Passe à Cloudbreak Pro pour consulter des sommets illimités.',
      'home.discoverPro': 'Découvrir Cloudbreak Pro',
      'home.notNow': 'Pas maintenant',
      'home.quotaNoCacheTitle': 'Aucune donnée pour ce sommet',
      'home.quotaNoCacheMessage': "Ta limite quotidienne est atteinte et ce sommet n'a pas encore été consulté aujourd'hui.",
      'home.offlineBanner': 'Données de %{time} · connexion requise pour actualiser',
      'home.offlineNoCacheTitle': 'Données non disponibles',
      'home.offlineNoCacheMessage': 'Connexion requise pour voir une prévision fraîche.',
      'common.networkHint': 'Vérifie ta connexion et réessaie.',
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
      'home.calendar.weekdaysShort.sun': 'Dim.',
      'home.calendar.weekdaysShort.mon': 'Lun.',
      'home.calendar.weekdaysShort.tue': 'Mar.',
      'home.calendar.weekdaysShort.wed': 'Mer.',
      'home.calendar.weekdaysShort.thu': 'Jeu.',
      'home.calendar.weekdaysShort.fri': 'Ven.',
      'home.calendar.weekdaysShort.sat': 'Sam.',
      'home.calendar.monthsShort.jan': 'jan.',
      'home.calendar.monthsShort.feb': 'fév.',
      'home.calendar.monthsShort.mar': 'mar.',
      'home.calendar.monthsShort.apr': 'avr.',
      'home.calendar.monthsShort.may': 'mai',
      'home.calendar.monthsShort.jun': 'juin',
      'home.calendar.monthsShort.jul': 'juil.',
      'home.calendar.monthsShort.aug': 'août',
      'home.calendar.monthsShort.sep': 'sept.',
      'home.calendar.monthsShort.oct': 'oct.',
      'home.calendar.monthsShort.nov': 'nov.',
      'home.calendar.monthsShort.dec': 'déc.',
      'score.label.none': 'Pas de nuages',
      'score.label.high': 'Élevée',
      'score.label.medium': 'Moyenne',
      'score.label.low': 'Faible',
      'score.none': 'Pas de nuages',
      'score.high': 'Élevée',
      'score.medium': 'Moyenne',
      'score.low': 'Faible',
      'score.context.high.favorable_window': 'Conditions favorables : la couche est bien placée pour une mer de nuage.',
      'paywall.quotaCounterNone': 'Quota épuisé',
      'paywall.quotaTitle': 'Quota atteint',
      'paywall.quotaSubtitle': 'Vous avez atteint votre limite quotidienne.',
      'paywall.title': 'Débloquer les prévisions illimitées',
      'paywall.subtitle': 'Accédez à toutes vos prévisions, sans limite quotidienne.',
      'paywall.premiumLabel': 'Premium',
      'paywall.premiumPrice': '5€ / mois',
      'paywall.premiumDescription': 'Prévisions illimitées, accès complet.',
      'paywall.proLabel': 'Pro',
      'paywall.proPrice': '45€ / an',
      'paywall.proDescription': 'Le meilleur rapport qualité / prix.',
      'paywall.ctaStart': "Commencer l'essai gratuit",
      'paywall.ctaRestore': 'Restaurer un achat',
      'paywall.dismiss': 'Continuer sans Premium',
    };
    return map[key] ?? key;
  },
}));

jest.mock('@/constants/devConfig', () => ({
  MOCK_API: true,
}));

jest.mock('@/components/error-state', () => ({
  ErrorState: function MockErrorState(props: {
    title: string;
    message?: string;
    action?: { label: string; onPress: () => void };
    actionTestID?: string;
    secondaryAction?: { label: string; onPress: () => void };
  }) {
    const React = require('react');
    const { Text, TouchableOpacity, View } = require('react-native');
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, props.title),
      props.action
        ? React.createElement(
            TouchableOpacity,
            { testID: props.actionTestID, onPress: props.action.onPress },
            React.createElement(Text, null, props.action.label),
          )
        : null,
      props.secondaryAction
        ? React.createElement(
            TouchableOpacity,
            { testID: 'secondary-action-btn', onPress: props.secondaryAction.onPress },
            React.createElement(Text, null, props.secondaryAction.label),
          )
        : null,
    );
  },
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    scheme: 'light',
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
      fontFamily: { regular: 'Josefin Sans', light: 'Josefin Sans', semiBold: 'Josefin Sans', bold: 'Josefin Sans' },
      fontSize: { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, hero: 72 },
      lineHeight: { tight: 1.1 },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    radius: { sm: 8, full: 999 },
  }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'fr', toggleLocale: jest.fn() }),
}));

const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseSelectedPeak = jest.fn();
jest.mock('@/contexts/SelectedPeakContext', () => ({
  useSelectedPeak: () => mockUseSelectedPeak(),
}));

const mockUseWeekData = jest.fn();
jest.mock('@/hooks/useWeekData', () => ({
  useWeekData: () => mockUseWeekData(),
}));

const mockUseFavorites = jest.fn();
jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => mockUseFavorites(),
}));

const mockShowPaywall = jest.fn();
const mockHidePaywall = jest.fn();
let mockPaywallVisible = false;
jest.mock('@/contexts/PaywallContext', () => ({
  usePaywall: () => ({
    paywallVisible: mockPaywallVisible,
    showPaywall: mockShowPaywall,
    hidePaywall: mockHidePaywall,
  }),
}));

// --- Helpers ---

const DEFAULT_PEAK = {
  id: 'peak-1',
  name: 'Mont Blanc',
  slug: 'mont-blanc',
  lat: 45.8326,
  lng: 6.8652,
  altitude: 4808,
  region: 'Massif du Mont-Blanc',
};

const mockSetSelectedDate = jest.fn();
const mockSetSelectedHour = jest.fn();

const MOCK_SCORE_DATA: ScoreResponse = {
  score: 84,
  verdict: 'high',
  label_code: 'score.label.high',
  cloud_base: 1200,
  peak_name: 'Mont Blanc',
  peak_altitude: 4808,
  peak_region: 'Massif du Mont-Blanc',
  peak_slug: 'mont-blanc',
  label: 'Élevée',
  context_code: 'score.context.high.favorable_window',
  context_message: 'Conditions favorables : la couche est bien placée pour une mer de nuage.',
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

/** Crée un WeekData minimal pour un seul créneau date+hour. */
function makeWeekData(score: ScoreResponse, date = '2026-03-24', hour = 6): WeekData {
  return {
    byDate: { [date]: { [hour]: score } },
    bestByDate: { [date]: { score: score.score, verdict: score.verdict, hour } },
  };
}

function setupSuccess(
  score: Partial<ScoreResponse> = MOCK_SCORE_DATA,
  date = '2026-03-24',
  hour = 6,
  quotaExceeded = false,
) {
  mockUseWeekData.mockReturnValue({
    data: makeWeekData({ ...MOCK_SCORE_DATA, ...score } as ScoreResponse, date, hour),
    loading: false,
    error: null,
    quotaExceeded,
    fromCache: false,
    cachedAt: null,
    refresh: jest.fn(),
  });
}

function setupLoading(existingData: WeekData | null = null) {
  mockUseWeekData.mockReturnValue({
    data: existingData,
    loading: true,
    error: null,
    quotaExceeded: false,
    fromCache: false,
    cachedAt: null,
    refresh: jest.fn(),
  });
}

function setupError(message = 'Erreur de chargement', quotaExceeded = false) {
  mockUseWeekData.mockReturnValue({
    data: null,
    loading: false,
    error: message,
    quotaExceeded,
    fromCache: false,
    cachedAt: null,
    refresh: jest.fn(),
  });
}

function setupIdle() {
  mockUseWeekData.mockReturnValue({
    data: null,
    loading: false,
    error: null,
    quotaExceeded: false,
    fromCache: false,
    cachedAt: null,
    refresh: jest.fn(),
  });
}

// --- Tests ---

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-03-24T08:00:00Z'));
    mockPush.mockReset();
    mockSetSelectedDate.mockReset();
    mockSetSelectedHour.mockReset();
    mockUseAuth.mockReturnValue({ session: { access_token: 'mock-token' }, loading: false });
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: null,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    setupIdle();
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
      setSelectedHour: mockSetSelectedHour,
    });
    setupLoading();

    render(<HomeScreen />);
    expect(screen.getByTestId('home-skeleton')).toBeTruthy();
    expect(screen.getByTestId('score-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('week-strip')).toBeNull();
    expect(screen.queryByTestId('favorite-toggle-button')).toBeNull();
    expect(screen.queryByTestId('share-button')).toBeNull();
  });

  it('affiche_scorecard_en_succes', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess();

    render(<HomeScreen />);
    expect(screen.getByTestId('score-card')).toBeTruthy();
    expect(screen.getByText('Conditions favorables : la couche est bien placée pour une mer de nuage.')).toBeTruthy();
    expect(screen.getByTestId('week-strip')).toBeTruthy();
    expect(screen.getByText('Activer une alerte')).toBeTruthy();
  });

  it("auto-synchronise l heure quand la date sélectionnée n existe pas dans le cache", async () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-23',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    mockUseWeekData.mockReturnValue({
      data: makeWeekData(MOCK_SCORE_DATA, '2026-03-24', 14),
      loading: false,
      error: null,
    });

    render(<HomeScreen />);

    await waitFor(() => {
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2026-03-24');
      expect(mockSetSelectedHour).toHaveBeenCalledWith(14);
    });
  });

  it("auto-synchronise à 6h quand le meilleur créneau est nul", () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-23',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    mockUseWeekData.mockReturnValue({
      data: makeWeekData({ ...MOCK_SCORE_DATA, score: 0, verdict: 'none' }, '2026-03-24', 14),
      loading: false,
      error: null,
    });
    render(<HomeScreen />);

    expect(mockSetSelectedDate).toHaveBeenCalledWith('2026-03-24');
    expect(mockSetSelectedHour).toHaveBeenCalledWith(6);
  });

  it('affiche_la_region_dans_le_header_du_sommet', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess();

    render(<HomeScreen />);

    expect(screen.getByText('4808 m · Massif du Mont-Blanc')).toBeTruthy();
  });

  it("n'affiche pas le séparateur si la région est absente", () => {
    const peakWithoutRegion = {
      id: 'peak-1',
      name: 'Mont Blanc',
      slug: 'mont-blanc',
      lat: 45.8326,
      lng: 6.8652,
      altitude: 4808,
    };

    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: peakWithoutRegion,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess();

    render(<HomeScreen />);

    expect(screen.getByText('4808 m')).toBeTruthy();
    expect(screen.queryByText('4808 m ·')).toBeNull();
  });

  it('affiche_erreur_si_api_echoue', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    setupError('Erreur de chargement');

    render(<HomeScreen />);
    expect(screen.getByText('Impossible de charger la prévision')).toBeTruthy();
  });

  it('affiche_erreur_generique_quelle_que_soit_le_message', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    setupError('Service momentanément indisponible');

    render(<HomeScreen />);
    expect(screen.getByText('Impossible de charger la prévision')).toBeTruthy();
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

  it('retourne_null_si_sommet_selectionne_et_weekdata_absent', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    setupIdle();

    render(<HomeScreen />);
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
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess();

    render(<HomeScreen />);
    expect(screen.getByTestId('score-card')).toBeTruthy();
    expect(screen.getByText('HUMIDITÉ')).toBeTruthy();
    expect(screen.getByText('VENT')).toBeTruthy();
    expect(screen.getByText('INVERSION')).toBeTruthy();
    expect(screen.getByText('86%')).toBeTruthy();
    expect(screen.getByText('7 km/h')).toBeTruthy();
    expect(screen.getByText('Oui')).toBeTruthy();
  });

  it('garde le score visible pendant un refresh du meme sommet', () => {
    const existingData = makeWeekData(MOCK_SCORE_DATA);
    let currentState = { data: existingData, loading: false, error: null };
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    mockUseWeekData.mockImplementation(() => currentState);

    const { rerender } = render(<HomeScreen />);
    expect(screen.getByText('Conditions favorables : la couche est bien placée pour une mer de nuage.')).toBeTruthy();

    // Refresh du même sommet — les données sont conservées pendant le fetch
    currentState = { data: existingData, loading: true, error: null };
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
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess();

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
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess();

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
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess();

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
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess();

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
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess({
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
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess({ ...MOCK_SCORE_DATA, conditions: undefined });

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
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess({
      ...MOCK_SCORE_DATA,
      verdict: 'low',
      conditions: {
        cloud_base_score: 0.2,
        humidity_score: 0.2,
        wind_score: 0.2,
        inversion_score: 0.2,
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
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess();

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
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess({ ...MOCK_SCORE_DATA, peak_slug: undefined });

    render(<HomeScreen />);
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

  it('change la date via le week strip et selectionne l heure optimale', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    // weekData avec le score du mercredi à 14h
    const weekData: WeekData = {
      byDate: {
        '2026-03-24': { 6: MOCK_SCORE_DATA },
        '2026-03-25': { 14: { ...MOCK_SCORE_DATA, score: 36, verdict: 'low' } },
      },
      bestByDate: {
        '2026-03-24': { score: 84, verdict: 'high', hour: 6 },
        '2026-03-25': { score: 36, verdict: 'low', hour: 14 },
      },
    };
    mockUseWeekData.mockReturnValue({ data: weekData, loading: false, error: null });

    render(<HomeScreen />);
    // 2026-03-24 = mardi → offset+1 = mercredi = 'Mer.'
    fireEvent.press(screen.getByText('Mer.'));

    expect(mockSetSelectedDate).toHaveBeenCalledWith('2026-03-25');
    expect(mockSetSelectedHour).toHaveBeenCalledWith(14);
  });

  it('revient à 6h si le jour sélectionné est à 0% toute la journée', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    const weekData: WeekData = {
      byDate: {
        '2026-03-24': { 6: MOCK_SCORE_DATA },
        '2026-03-25': { 6: { ...MOCK_SCORE_DATA, score: 0, verdict: 'none' } },
      },
      bestByDate: {
        '2026-03-24': { score: 84, verdict: 'high', hour: 6 },
        '2026-03-25': { score: 0, verdict: 'none', hour: 6 },
      },
    };
    mockUseWeekData.mockReturnValue({ data: weekData, loading: false, error: null });

    render(<HomeScreen />);
    // 2026-03-24 = mardi → offset+1 = mercredi = 'Mer.'
    fireEvent.press(screen.getByText('Mer.'));

    expect(mockSetSelectedDate).toHaveBeenCalledWith('2026-03-25');
    expect(mockSetSelectedHour).toHaveBeenCalledWith(6);
  });

  it('n applique pas les donnees du sommet precedent lors du changement de sommet', () => {
    const alternatePeak = { ...DEFAULT_PEAK, id: 'peak-2', name: 'Aiguille Verte' };
    mockUseSelectedPeak
      .mockReturnValueOnce({
        selectedPeak: DEFAULT_PEAK,
        selectedDate: '2026-03-24',
        selectedHour: 6,
        setSelectedPeak: jest.fn(),
        setSelectedDate: mockSetSelectedDate,
        setSelectedHour: mockSetSelectedHour,
      })
      .mockReturnValue({
        selectedPeak: alternatePeak,
        selectedDate: '2026-03-24',
        selectedHour: 6,
        setSelectedPeak: jest.fn(),
        setSelectedDate: mockSetSelectedDate,
        setSelectedHour: mockSetSelectedHour,
      });

    let currentWeekDataState: { data: WeekData | null; loading: boolean; error: string | null } = {
      data: makeWeekData(MOCK_SCORE_DATA),
      loading: false,
      error: null,
    };
    mockUseWeekData.mockImplementation(() => currentWeekDataState);

    const { rerender } = render(<HomeScreen />);
    expect(screen.getByTestId('score-card')).toBeTruthy();

    // Changement de sommet — data=null car reset immédiat dans le hook
    currentWeekDataState = { data: null, loading: true, error: null };
    rerender(<HomeScreen />);

    expect(screen.getByTestId('score-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('score-card')).toBeNull();
  });

  it('ouvre lalerte native depuis le CTA dalerte', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess();

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
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess({ ...MOCK_SCORE_DATA, conditions: undefined });

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
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess({
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
    });

    render(<HomeScreen />);
    expect(screen.getByText('31%')).toBeTruthy();
    expect(screen.getByText('12 km/h')).toBeTruthy();
    expect(screen.getByText('Non')).toBeTruthy();
    expect(screen.queryByText('Activer une alerte')).toBeNull();
  });

  it('conserve le dernier score valide pendant un refresh du meme sommet', () => {
    const existingData = makeWeekData(MOCK_SCORE_DATA);
    let currentState = { data: existingData, loading: false, error: null };
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    mockUseWeekData.mockImplementation(() => currentState);

    const { rerender } = render(<HomeScreen />);
    expect(screen.getByTestId('score-card')).toBeTruthy();

    currentState = { data: existingData, loading: true, error: null };
    rerender(<HomeScreen />);

    expect(screen.getByTestId('score-card')).toBeTruthy();
    expect(screen.queryByTestId('score-skeleton')).toBeNull();
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
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess();

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

  it('appelle setSelectedHour quand on presse un chip horaire dans la ScoreCard', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess();

    render(<HomeScreen />);
    // Presser le chip "08h" pour déclencher onSelectHour (ligne 172)
    fireEvent.press(screen.getByText('08h'));
    expect(mockSetSelectedHour).toHaveBeenCalledWith(8);
  });

  it('ouvre le paywall automatiquement quand quotaExceeded passe a true', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess(MOCK_SCORE_DATA, '2026-03-24', 6, true);

    render(<HomeScreen />);
    expect(screen.getByTestId('quota-counter-badge')).toBeTruthy();
    expect(mockShowPaywall).toHaveBeenCalled();
  });

  it('affiche le badge quota et appelle showPaywall au clic', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    setupSuccess(MOCK_SCORE_DATA, '2026-03-24', 6, true);

    render(<HomeScreen />);
    const badge = screen.getByTestId('quota-counter-badge');
    expect(badge).toBeTruthy();
    fireEvent.press(badge);
    expect(mockShowPaywall).toHaveBeenCalled();
  });

  it('affiche la carte quota exceeded et appelle showPaywall au clic sur le bouton', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    setupError('QUOTA_EXCEEDED', true);

    render(<HomeScreen />);
    expect(screen.getByText('Quota atteint')).toBeTruthy();
    const openPaywallBtn = screen.getByTestId('quota-open-paywall-button');
    expect(openPaywallBtn).toBeTruthy();
    fireEvent.press(openPaywallBtn);
    expect(mockShowPaywall).toHaveBeenCalled();
  });

  it('affiche le bouton Pas maintenant sur la carte quota et masque la carte au clic', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    setupError('QUOTA_EXCEEDED', true);

    render(<HomeScreen />);
    expect(screen.getByText('Quota atteint')).toBeTruthy();
    fireEvent.press(screen.getByTestId('secondary-action-btn'));
    expect(screen.queryByText('Quota atteint')).toBeNull();
  });

  it('affiche un état neutre (pas l\'erreur réseau générique) quand le quota est dismiss sans cache ni sommet précédent', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    setupError('QUOTA_EXCEEDED', true);

    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId('secondary-action-btn'));

    expect(screen.getByText('Aucune donnée pour ce sommet')).toBeTruthy();
    expect(screen.queryByText('Impossible de charger la prévision')).toBeNull();
  });

  it('revient automatiquement sur le dernier sommet chargé avec succès quand on dismiss sans cache', () => {
    const peakA = DEFAULT_PEAK;
    const peakB = { ...DEFAULT_PEAK, id: 'peak-2', name: 'Aiguille Verte' };
    const mockSetSelectedPeak = jest.fn();

    let currentSelectedPeak = peakA;
    mockUseSelectedPeak.mockImplementation(() => ({
      selectedPeak: currentSelectedPeak,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: mockSetSelectedPeak,
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    }));

    let currentWeekDataState: { data: WeekData | null; loading: boolean; error: string | null; quotaExceeded: boolean } = {
      data: makeWeekData(MOCK_SCORE_DATA),
      loading: false,
      error: null,
      quotaExceeded: false,
    };
    mockUseWeekData.mockImplementation(() => currentWeekDataState);

    const { rerender } = render(<HomeScreen />);
    expect(screen.getByTestId('score-card')).toBeTruthy();

    // Sommet B sélectionné — pas de cache, quota dépassé
    currentSelectedPeak = peakB;
    currentWeekDataState = { data: null, loading: false, error: 'QUOTA_EXCEEDED', quotaExceeded: true };
    rerender(<HomeScreen />);
    fireEvent.press(screen.getByTestId('secondary-action-btn'));

    expect(mockSetSelectedPeak).toHaveBeenCalledWith(peakA);
  });

  it('réaffiche la carte quota pour un nouveau sommet même si elle avait été dismiss pour le précédent', () => {
    const peakA = DEFAULT_PEAK;
    const peakB = { ...DEFAULT_PEAK, id: 'peak-2', name: 'Aiguille Verte' };

    let currentSelectedPeak = peakA;
    mockUseSelectedPeak.mockImplementation(() => ({
      selectedPeak: currentSelectedPeak,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    }));
    setupError('QUOTA_EXCEEDED', true);

    const { rerender } = render(<HomeScreen />);
    fireEvent.press(screen.getByTestId('secondary-action-btn'));
    expect(screen.queryByText('Quota atteint')).toBeNull();

    currentSelectedPeak = peakB;
    rerender(<HomeScreen />);
    expect(screen.getByText('Quota atteint')).toBeTruthy();
  });

  it('affiche le bandeau offline quand fromCache est vrai', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    mockUseWeekData.mockReturnValue({
      data: makeWeekData(MOCK_SCORE_DATA),
      loading: false,
      error: null,
      quotaExceeded: false,
      fromCache: true,
      cachedAt: new Date('2026-03-24T08:38:00Z').getTime(),
      refresh: jest.fn(),
    });

    render(<HomeScreen />);

    expect(screen.getByText(/connexion requise pour actualiser/)).toBeTruthy();
  });

  it("affiche l'état OFFLINE_NO_CACHE sans bouton", () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    mockUseWeekData.mockReturnValue({
      data: null,
      loading: false,
      error: 'OFFLINE_NO_CACHE',
      quotaExceeded: false,
      fromCache: false,
      cachedAt: null,
      refresh: jest.fn(),
    });

    render(<HomeScreen />);

    expect(screen.getByText('Données non disponibles')).toBeTruthy();
    expect(screen.getByText('Connexion requise pour voir une prévision fraîche.')).toBeTruthy();
    expect(screen.queryByTestId('quota-open-paywall-button')).toBeNull();
    expect(screen.queryByTestId('secondary-action-btn')).toBeNull();
    expect(screen.queryByText('Rechercher un sommet')).toBeNull();
  });

  it('déclenche refresh() via pull-to-refresh', () => {
    const mockRefresh = jest.fn();
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-24',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: mockSetSelectedDate,
      setSelectedHour: mockSetSelectedHour,
    });
    mockUseWeekData.mockReturnValue({
      data: null,
      loading: false,
      error: 'OFFLINE_NO_CACHE',
      quotaExceeded: false,
      fromCache: false,
      cachedAt: null,
      refresh: mockRefresh,
    });

    render(<HomeScreen />);
    const refreshControl = screen.UNSAFE_getByProps({ onRefresh: mockRefresh });
    fireEvent(refreshControl, 'refresh');

    expect(mockRefresh).toHaveBeenCalled();
  });

});

