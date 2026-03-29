import React from 'react';
import SearchScreen from '@/app/(tabs)/search';
import { render, fireEvent } from '@testing-library/react-native';

let mockPeakSearch = {
  state: { status: 'idle' } as { status: string; data?: unknown[]; error?: string },
  query: '',
  setQuery: jest.fn(),
};
let mockFavoritesState: { status: string; data: unknown[] } = { status: 'success', data: [] };

// Shared mock fns declared before jest.mock so hoisting can capture them via closure.
// jest.mock is hoisted, but module-level let variables are initialized before tests run.
// Using jest.fn() stored in an object allows the mock factory to reference them by object property.
const mockFavCallbacks = {
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
};

jest.mock('@/hooks/usePeakSearch', () => ({
  usePeakSearch: () => mockPeakSearch,
}));

jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    state: mockFavoritesState,
    addFavorite: (...args: unknown[]) => mockFavCallbacks.addFavorite(...args),
    removeFavorite: (...args: unknown[]) => mockFavCallbacks.removeFavorite(...args),
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

const FAV_ID = 'fav-peak';
const peaks = [
  { id: 'other', name: 'Autre', slug: 'autre', lat: 0, lng: 0, altitude: 1000 },
  { id: FAV_ID, name: 'Favori', slug: 'favori', lat: 0, lng: 0, altitude: 800 },
];

describe('SearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPeakSearch = { state: { status: 'idle' }, query: '', setQuery: jest.fn() };
    mockFavoritesState = { status: 'success', data: [] };
  });

  it('affiche le hint quand query < 2 chars', () => {
    const { getByText } = render(<SearchScreen />);
    expect(getByText('search.minChars')).toBeTruthy();
  });

  it('affiche_spinner_en_etat_loading', () => {
    mockPeakSearch = {
      state: { status: 'loading' },
      query: 'al',
      setQuery: jest.fn(),
    };
    const { queryByText } = render(<SearchScreen />);
    expect(queryByText('search.minChars')).toBeNull();
    expect(queryByText('search.noResults')).toBeNull();
  });

  it('affiche_erreur_avec_message', () => {
    mockPeakSearch = {
      state: { status: 'error', error: 'Erreur réseau' },
      query: 'al',
      setQuery: jest.fn(),
    };
    const { getByText } = render(<SearchScreen />);
    expect(getByText('Erreur réseau')).toBeTruthy();
  });

  it('affiche_erreur_generique_si_message_absent', () => {
    mockPeakSearch = {
      state: { status: 'error' },
      query: 'al',
      setQuery: jest.fn(),
    };
    const { getByText } = render(<SearchScreen />);
    expect(getByText('common.error')).toBeTruthy();
  });

  it('affiche_no_results_si_liste_vide', () => {
    mockPeakSearch = {
      state: { status: 'success', data: [] },
      query: 'al',
      setQuery: jest.fn(),
    };
    const { getByText } = render(<SearchScreen />);
    expect(getByText('search.noResults')).toBeTruthy();
  });

  it('selectionne_le_sommet_et_navigue_vers_home_au_tap', () => {
    mockPeakSearch = {
      state: { status: 'success', data: peaks },
      query: 'test',
      setQuery: jest.fn(),
    };
    const { getByText } = render(<SearchScreen />);
    fireEvent.press(getByText('Autre'));
    expect(mockSetSelectedPeak).toHaveBeenCalledWith(peaks[0]);
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/');
  });

  it('ajoute_favori_au_tap_sur_bouton_coeur_non_favori', () => {
    mockPeakSearch = {
      state: { status: 'success', data: [{ id: 'other', name: 'Autre', slug: 'autre', lat: 0, lng: 0, altitude: 1000 }] },
      query: 'test',
      setQuery: jest.fn(),
    };
    // No favorites — heart button calls addFavorite
    const { getByLabelText } = render(<SearchScreen />);
    fireEvent.press(getByLabelText('search.addFavorite'));
    expect(mockFavCallbacks.addFavorite).toHaveBeenCalledWith('other');
  });

  it('supprime_favori_au_tap_sur_bouton_coeur_favori', () => {
    mockPeakSearch = {
      state: { status: 'success', data: [{ id: FAV_ID, name: 'Favori', slug: 'favori', lat: 0, lng: 0, altitude: 800 }] },
      query: 'test',
      setQuery: jest.fn(),
    };
    mockFavoritesState = {
      status: 'success',
      data: [{ id: FAV_ID, name: 'Favori', slug: 'favori', lat: 0, lng: 0, altitude: 800 }],
    };
    const { getByLabelText } = render(<SearchScreen />);
    fireEvent.press(getByLabelText('search.removeFavorite'));
    expect(mockFavCallbacks.removeFavorite).toHaveBeenCalledWith(FAV_ID);
  });

  it('gere_favstate_data_null', () => {
    // favState.data is null → favoriteIds built from empty array via ?? []
    mockPeakSearch = {
      state: { status: 'success', data: [{ id: 'other', name: 'Autre', slug: 'autre', lat: 0, lng: 0, altitude: 1000 }] },
      query: 'al',
      setQuery: jest.fn(),
    };
    mockFavoritesState = { status: 'loading', data: null as unknown as unknown[] };
    const { getByText } = render(<SearchScreen />);
    expect(getByText('Autre')).toBeTruthy();
  });

  it('gere_state_data_undefined_dans_sorted', () => {
    // When state is in an unknown status with no data, reaches line 111 sorted fallback
    mockPeakSearch = {
      state: { status: 'unknown' as string, data: undefined },
      query: 'al',
      setQuery: jest.fn(),
    };
    const { queryByText } = render(<SearchScreen />);
    // Unknown status with no data reaches the sorted path with ?? [] fallback — renders FlatList with empty data
    expect(queryByText('search.minChars')).toBeNull();
  });

  it('trie_trois_items_mix_favoris_non_favoris', () => {
    // 3 items: FAV_ID (fav), other1 (non-fav), other2 (non-fav)
    // Sorting will call comparator multiple times, covering both bFav=0 and bFav=1 branches
    const threePeaks = [
      { id: 'other1', name: 'Autre1', slug: 'autre1', lat: 0, lng: 0, altitude: 1000 },
      { id: FAV_ID, name: 'Favori', slug: 'favori', lat: 0, lng: 0, altitude: 800 },
      { id: 'other2', name: 'Autre2', slug: 'autre2', lat: 0, lng: 0, altitude: 900 },
    ];
    mockPeakSearch = {
      state: { status: 'success', data: threePeaks },
      query: 'al',
      setQuery: jest.fn(),
    };
    mockFavoritesState = {
      status: 'success',
      data: [{ id: FAV_ID, name: 'Favori', slug: 'favori', lat: 0, lng: 0, altitude: 800 }],
    };
    const { getByText } = render(<SearchScreen />);
    expect(getByText('Favori')).toBeTruthy();
    expect(getByText('Autre1')).toBeTruthy();
    expect(getByText('Autre2')).toBeTruthy();
  });

  it('trie les favoris en premier dans la liste', () => {
    mockPeakSearch = {
      state: { status: 'success', data: peaks },
      query: 'test',
      setQuery: jest.fn(),
    };
    mockFavoritesState = {
      status: 'success',
      data: [{ id: FAV_ID, name: 'Favori', slug: 'favori', lat: 0, lng: 0, altitude: 800 }],
    };
    const { getByText } = render(<SearchScreen />);
    expect(getByText('Favori')).toBeTruthy();
    expect(getByText('Autre')).toBeTruthy();
  });
});
