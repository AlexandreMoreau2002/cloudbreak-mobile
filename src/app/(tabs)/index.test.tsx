import React from 'react';
import HomeScreen from '@/app/(tabs)/index';
import type { ScoreResponse } from '@/services/mockData/types';
import { render, screen, fireEvent } from '@testing-library/react-native';

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

// --- Shared defaults ---

const DEFAULT_PEAK = {
  id: 'peak-1',
  name: 'Mont Blanc',
  slug: 'mont-blanc',
  lat: 45.8326,
  lng: 6.8652,
  altitude: 4808,
};

const MOCK_SCORE_DATA: ScoreResponse = {
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
};

// --- Tests ---

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockReset();
    mockUseAuth.mockReturnValue({ session: { access_token: 'mock-token' }, loading: false });
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: null,
      selectedDate: '2026-03-23',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: jest.fn(),
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'idle' });
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

  it('affiche_skeleton_pendant_chargement', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-23',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: jest.fn(),
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'loading' });

    render(<HomeScreen />);
    expect(screen.getByTestId('score-skeleton')).toBeTruthy();
  });

  it('affiche_scorecard_en_succes', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-23',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: jest.fn(),
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'success', data: MOCK_SCORE_DATA });

    render(<HomeScreen />);
    expect(screen.getByTestId('score-card')).toBeTruthy();
  });

  it('affiche_erreur_si_api_echoue', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-23',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: jest.fn(),
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'error', error: 'Erreur de chargement' });

    render(<HomeScreen />);
    expect(screen.getByText('Impossible de charger la prévision')).toBeTruthy();
  });

  it('affiche_service_indisponible_si_erreur_503', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-23',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: jest.fn(),
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

  it('retourne_null_si_sommet_selectionne_et_etat_idle', () => {
    mockUseSelectedPeak.mockReturnValue({
      selectedPeak: DEFAULT_PEAK,
      selectedDate: '2026-03-23',
      selectedHour: 6,
      setSelectedPeak: jest.fn(),
      setSelectedDate: jest.fn(),
      setSelectedHour: jest.fn(),
    });
    mockUseScore.mockReturnValue({ status: 'idle' });

    render(<HomeScreen />);
    // No scorecard, no skeleton, no error — renders empty content
    expect(screen.queryByTestId('score-card')).toBeNull();
    expect(screen.queryByTestId('score-skeleton')).toBeNull();
  });
});
