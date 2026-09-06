import React from 'react';
import { FlatList } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import SearchScreen from '@/app/(tabs)/search';

let mockPeakSearch = {
  state: { status: 'idle' } as { status: string; data?: unknown[]; error?: string },
  query: '',
  setQuery: jest.fn(),
};
let mockFavoritesState: { status: string; data: unknown[] } = { status: 'success', data: [] };
let mockAuth = { session: { access_token: 'token', user: { is_anonymous: false } }, isAnonymous: false };

const mockFavCallbacks = {
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
};

const mockRequireAccount = jest.fn();
const mockRetry = jest.fn();

jest.mock('@/hooks/usePeakSearch', () => ({
  usePeakSearch: () => ({ ...mockPeakSearch, retry: mockRetry }),
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

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('@/contexts/AccountGateContext', () => ({
  useAccountGate: () => ({ requireAccount: mockRequireAccount }),
}));

jest.mock('@/utils/i18n', () => ({ t: (k: string) => k }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/services/analytics', () => ({ track: jest.fn() }));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockSetSelectedPeak = jest.fn();
jest.mock('@/contexts/SelectedPeakContext', () => ({
  useSelectedPeak: () => ({ setSelectedPeak: mockSetSelectedPeak }),
}));

jest.mock('@/components/empty-state', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    EmptyState: function MockEmptyState(props: { title: string }) {
      return React.createElement(Text, null, props.title);
    },
  };
});
jest.mock('@/components/async-state-view', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    AsyncStateView: function MockAsyncStateView(props: {
      isLoading: boolean;
      isEmpty: boolean;
      error?: string | null;
      loadingComponent?: unknown;
      emptyComponent: unknown;
      errorComponent?: unknown;
      children: unknown;
    }) {
      if (props.isLoading) {
        return props.loadingComponent ?? React.createElement(View, { testID: 'loading-spinner' });
      }
      if (props.error) return props.errorComponent ?? null;
      if (props.isEmpty) return props.emptyComponent;
      return props.children;
    },
  };
});

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
    mockAuth = { session: { access_token: 'token', user: { is_anonymous: false } }, isAnonymous: false };
  });

  it('affiche le hint quand query < 2 chars', () => {
    const { getByText } = render(<SearchScreen />);
    expect(getByText('search.minChars')).toBeTruthy();
  });

  it('affiche LoadingSpinner en état loading', () => {
    mockPeakSearch = {
      state: { status: 'loading' },
      query: 'al',
      setQuery: jest.fn(),
    };
    const { queryByText, getByTestId } = render(<SearchScreen />);
    expect(queryByText('search.minChars')).toBeNull();
    expect(queryByText('search.noResults')).toBeNull();
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('affiche ErrorState en cas d\'erreur', () => {
    mockPeakSearch = {
      state: { status: 'error', error: 'Erreur réseau' },
      query: 'al',
      setQuery: jest.fn(),
    };
    const { getByText } = render(<SearchScreen />);
    expect(getByText('common.error')).toBeTruthy();
  });

  it('permet de réessayer une recherche échouée', () => {
    mockPeakSearch = { state: { status: 'error', error: 'Erreur réseau' }, query: 'mont', setQuery: jest.fn() };
    const { getByText } = render(<SearchScreen />);
    fireEvent.press(getByText('common.retry'));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('transmet le premier tap sur un résultat même si le clavier est ouvert', () => {
    mockPeakSearch = { state: { status: 'success', data: peaks }, query: 'mont', setQuery: jest.fn() };
    const screen = render(<SearchScreen />);
    expect(screen.UNSAFE_getByType(FlatList).props.keyboardShouldPersistTaps).toBe('handled');
    fireEvent.press(screen.getByText('Autre'));
    expect(mockSetSelectedPeak).toHaveBeenCalledWith(peaks[0]);
  });

  it('affiche ErrorState même si message absent', () => {
    mockPeakSearch = {
      state: { status: 'error' },
      query: 'al',
      setQuery: jest.fn(),
    };
    const { getByText } = render(<SearchScreen />);
    expect(getByText('common.error')).toBeTruthy();
  });

  it('affiche EmptyState si liste vide', () => {
    mockPeakSearch = {
      state: { status: 'success', data: [] },
      query: 'al',
      setQuery: jest.fn(),
    };
    const { getByText } = render(<SearchScreen />);
    expect(getByText('search.noResults')).toBeTruthy();
  });

  it('sélectionne le sommet et navigue vers home au tap', () => {
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

  it('tracks peak_selected with source search on row press', () => {
    const { track } = jest.requireMock('@/services/analytics');
    mockPeakSearch = {
      state: { status: 'success', data: peaks },
      query: 'test',
      setQuery: jest.fn(),
    };
    const { getByText } = render(<SearchScreen />);
    fireEvent.press(getByText('Autre'));
    expect(track).toHaveBeenCalledWith('peak_selected', { peak_id: 'other', source: 'search' });
  });

  it('ajoute un favori au tap sur le bouton coeur non favori', () => {
    mockPeakSearch = {
      state: { status: 'success', data: [{ id: 'other', name: 'Autre', slug: 'autre', lat: 0, lng: 0, altitude: 1000 }] },
      query: 'test',
      setQuery: jest.fn(),
    };
    const { getByLabelText } = render(<SearchScreen />);
    fireEvent.press(getByLabelText('search.addFavorite'));
    expect(mockFavCallbacks.addFavorite).toHaveBeenCalledWith('other');
  });

  it('un invité ouvre account au tap favori sans mutation API', () => {
    mockAuth = { session: { access_token: 'guest-token', user: { is_anonymous: true } }, isAnonymous: true };
    mockPeakSearch = {
      state: { status: 'success', data: [{ id: 'other', name: 'Autre', slug: 'autre', lat: 0, lng: 0, altitude: 1000 }] },
      query: 'test',
      setQuery: jest.fn(),
    };
    const { getByLabelText } = render(<SearchScreen />);

    fireEvent.press(getByLabelText('search.addFavorite'));

    expect(mockRequireAccount).toHaveBeenCalledWith({ kind: 'favorite', peakId: 'other' });
    expect(mockFavCallbacks.addFavorite).not.toHaveBeenCalled();
  });

  it('supprime un favori au tap sur le bouton coeur favori', () => {
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

  it('gère favState.data null', () => {
    mockPeakSearch = {
      state: { status: 'success', data: [{ id: 'other', name: 'Autre', slug: 'autre', lat: 0, lng: 0, altitude: 1000 }] },
      query: 'al',
      setQuery: jest.fn(),
    };
    mockFavoritesState = { status: 'loading', data: null as unknown as unknown[] };
    const { getByText } = render(<SearchScreen />);
    expect(getByText('Autre')).toBeTruthy();
  });

  it('gère state.data undefined dans sorted', () => {
    mockPeakSearch = {
      state: { status: 'unknown' as string, data: undefined },
      query: 'al',
      setQuery: jest.fn(),
    };
    const { queryByText } = render(<SearchScreen />);
    expect(queryByText('search.minChars')).toBeNull();
  });

  it('trie trois items — mix favoris / non-favoris', () => {
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

  it('gère state.data undefined quand status success', () => {
    mockPeakSearch = {
      state: { status: 'success', data: undefined },
      query: 'al',
      setQuery: jest.fn(),
    };
    const { queryByText } = render(<SearchScreen />);
    expect(queryByText('search.minChars')).toBeNull();
  });
});
