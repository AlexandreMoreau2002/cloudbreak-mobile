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

jest.mock('@/components/error-state', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    ErrorState: function MockErrorState(props: { title: string }) {
      return React.createElement(Text, null, props.title);
    },
  };
});
jest.mock('@/components/empty-state', () => {
  const React = jest.requireActual('react');
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    EmptyState: function MockEmptyState(props: { title: string; onCta?: () => void }) {
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(Text, null, props.title),
        props.onCta
          ? React.createElement(TouchableOpacity, { testID: 'empty-state-cta', onPress: props.onCta })
          : null,
      );
    },
  };
});
jest.mock('@/components/favorites-skeleton', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    FavoritesSkeleton: function MockFavoritesSkeleton() {
      return React.createElement(View, { testID: 'favorites-skeleton' });
    },
  };
});
jest.mock('@/components/async-state-view', () => ({
  AsyncStateView: function MockAsyncStateView(props: {
    isLoading: boolean;
    isEmpty: boolean;
    error?: string | null;
    loadingComponent?: unknown;
    emptyComponent: unknown;
    errorComponent?: unknown;
    children: unknown;
  }) {
    if (props.isLoading) return props.loadingComponent ?? null;
    if (props.error) return props.errorComponent ?? null;
    if (props.isEmpty) return props.emptyComponent;
    return props.children;
  },
}));

describe('FavoritesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { status: 'success', data: [] };
  });

  it("affiche l'état vide quand aucun favori", () => {
    const { getByText } = render(<FavoritesScreen />);
    expect(getByText('favorites.empty')).toBeTruthy();
  });

  it('affiche FavoritesSkeleton en état loading', () => {
    mockState = { status: 'loading' };
    const { getByTestId } = render(<FavoritesScreen />);
    expect(getByTestId('favorites-skeleton')).toBeTruthy();
  });

  it('affiche FavoritesSkeleton en état idle', () => {
    mockState = { status: 'idle' };
    const { getByTestId } = render(<FavoritesScreen />);
    expect(getByTestId('favorites-skeleton')).toBeTruthy();
  });

  it("affiche ErrorState en cas d'erreur réseau", () => {
    mockState = { status: 'error', error: 'Erreur réseau' };
    const { getByText } = render(<FavoritesScreen />);
    expect(getByText('favorites.errorTitle')).toBeTruthy();
  });

  it('affiche ErrorState même si message absent', () => {
    mockState = { status: 'error' };
    const { getByText } = render(<FavoritesScreen />);
    expect(getByText('favorites.errorTitle')).toBeTruthy();
  });

  it('affiche les favoris quand data présente', () => {
    mockState = {
      status: 'success',
      data: [{ id: '1', name: 'Mont Blanc', slug: 'mont-blanc', lat: 0, lng: 0, altitude: 4807 }],
    };
    const { getByText } = render(<FavoritesScreen />);
    expect(getByText('Mont Blanc')).toBeTruthy();
  });

  it('affiche plusieurs favoris', () => {
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

  it('supprime un favori au tap sur le bouton supprimer', () => {
    mockState = {
      status: 'success',
      data: [{ id: '1', name: 'Mont Blanc', slug: 'mont-blanc', lat: 0, lng: 0, altitude: 4807 }],
    };
    const { getByLabelText } = render(<FavoritesScreen />);
    fireEvent.press(getByLabelText('favorites.remove'));
    expect(mockRemoveFavorite).toHaveBeenCalledWith('1');
  });

  it('sélectionne le sommet et navigue vers home au tap', () => {
    const peak = { id: '1', name: 'Mont Blanc', slug: 'mont-blanc', lat: 0, lng: 0, altitude: 4807 };
    mockState = { status: 'success', data: [peak] };
    const { getByText } = render(<FavoritesScreen />);
    fireEvent.press(getByText('Mont Blanc'));
    expect(mockSetSelectedPeak).toHaveBeenCalledWith(peak);
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/');
  });

  it('tracks peak_selected with source favorites on row press', () => {
    const { track } = jest.requireMock('@/services/analytics');
    const peak = { id: '1', name: 'Mont Blanc', slug: 'mont-blanc', lat: 0, lng: 0, altitude: 4807 };
    mockState = { status: 'success', data: [peak] };
    const { getByText } = render(<FavoritesScreen />);
    fireEvent.press(getByText('Mont Blanc'));
    expect(track).toHaveBeenCalledWith('peak_selected', { peak_id: '1', source: 'favorites' });
  });

  it("navigue vers search au tap sur le CTA de l'état vide", () => {
    mockState = { status: 'success', data: [] };
    const { getByTestId } = render(<FavoritesScreen />);
    fireEvent.press(getByTestId('empty-state-cta'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/search');
  });

  it('gère state.data undefined quand status success', () => {
    mockState = { status: 'success', data: undefined };
    const { queryByText } = render(<FavoritesScreen />);
    expect(queryByText('favorites.empty')).toBeTruthy();
  });
});
