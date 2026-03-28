import React from 'react';
import FavoritesScreen from '@/app/(tabs)/favorites';
import { render, fireEvent } from '@testing-library/react-native';

const mockRemoveFavorite = jest.fn();
const mockRefresh = jest.fn();
let mockState: { status: string; data?: unknown[]; error?: string } = {
  status: 'success',
  data: [],
};

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    state: mockState,
    removeFavorite: mockRemoveFavorite,
    refresh: mockRefresh,
  }),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#EFE8DC', surface: '#F7F5F1', border: '#E9E4DA',
      accent: '#B28C6E', textPrimary: '#1A1A1A', textSecondary: '#5E5E5E',
      textDisabled: '#9E9E9E',
    },
    typography: { fontFamily: { regular: 'Josefin Sans', semiBold: 'Josefin Sans' }, fontSize: { xs: 12, sm: 14, md: 16 } },
    spacing: { xs: 4, sm: 8, md: 16, xl: 32 },
    radius: { sm: 8 },
  }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'fr', toggleLocale: jest.fn() }),
}));

jest.mock('@/utils/i18n', () => ({ t: (k: string) => k }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockSetSelectedPeak = jest.fn();
jest.mock('@/contexts/SelectedPeakContext', () => ({
  useSelectedPeak: () => ({ setSelectedPeak: mockSetSelectedPeak }),
}));

describe('FavoritesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { status: 'success', data: [] };
  });

  it('affiche l\'état vide quand aucun favori', () => {
    const { getByText } = render(<FavoritesScreen />);
    expect(getByText('favorites.empty')).toBeTruthy();
  });

  it('affiche le spinner en état loading', () => {
    mockState = { status: 'loading' };
    const { queryByText } = render(<FavoritesScreen />);
    expect(queryByText('favorites.empty')).toBeNull();
  });

  it('affiche_spinner_en_etat_idle', () => {
    mockState = { status: 'idle' };
    const { queryByText } = render(<FavoritesScreen />);
    expect(queryByText('favorites.empty')).toBeNull();
  });

  it('affiche_erreur_si_state_error_avec_message', () => {
    mockState = { status: 'error', error: 'Erreur réseau' };
    const { getByText } = render(<FavoritesScreen />);
    expect(getByText('Erreur réseau')).toBeTruthy();
  });

  it('affiche_erreur_generique_si_message_absent', () => {
    mockState = { status: 'error' };
    const { getByText } = render(<FavoritesScreen />);
    expect(getByText('common.error')).toBeTruthy();
  });

  it('affiche les favoris quand data présente', () => {
    mockState = {
      status: 'success',
      data: [{ id: '1', name: 'Mont Blanc', slug: 'mont-blanc', lat: 0, lng: 0, altitude: 4807 }],
    };
    const { getByText } = render(<FavoritesScreen />);
    expect(getByText('Mont Blanc')).toBeTruthy();
  });

  it('affiche_separateur_entre_plusieurs_favoris', () => {
    mockState = {
      status: 'success',
      data: [
        { id: '1', name: 'Mont Blanc', slug: 'mont-blanc', lat: 0, lng: 0, altitude: 4807 },
        { id: '2', name: 'Aiguille Verte', slug: 'aiguille-verte', lat: 0, lng: 0, altitude: 4122 },
      ],
    };
    const { getByText } = render(<FavoritesScreen />);
    expect(getByText('Mont Blanc')).toBeTruthy();
    expect(getByText('Aiguille Verte')).toBeTruthy();
  });

  it('supprime_favori_au_tap_sur_bouton_supprimer', () => {
    mockState = {
      status: 'success',
      data: [{ id: '1', name: 'Mont Blanc', slug: 'mont-blanc', lat: 0, lng: 0, altitude: 4807 }],
    };
    const { getByLabelText } = render(<FavoritesScreen />);
    fireEvent.press(getByLabelText('favorites.remove'));
    expect(mockRemoveFavorite).toHaveBeenCalledWith('1');
  });

  it('selectionne_le_sommet_et_navigue_vers_home_au_tap', () => {
    const peak = { id: '1', name: 'Mont Blanc', slug: 'mont-blanc', lat: 0, lng: 0, altitude: 4807 };
    mockState = { status: 'success', data: [peak] };
    const { getByText } = render(<FavoritesScreen />);
    fireEvent.press(getByText('Mont Blanc'));
    expect(mockSetSelectedPeak).toHaveBeenCalledWith(peak);
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/');
  });
});
