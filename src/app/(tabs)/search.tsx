/**
 * SearchScreen — recherche de sommets et gestion des favoris depuis la liste de résultats.
 */
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import i18n from '@/utils/i18n';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useFavorites } from '@/hooks/useFavorites';
import { usePeakSearch } from '@/hooks/usePeakSearch';
import type { Peak } from '@/services/mockData/types';
import { useSelectedPeak } from '@/contexts/SelectedPeakContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HOME_ROUTE = '/(tabs)/' as Href;

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radius } = useTheme();
  const { state, query, setQuery } = usePeakSearch();
  const { state: favState, addFavorite, removeFavorite } = useFavorites();
  const { setSelectedPeak } = useSelectedPeak();

  const favoriteIds = new Set((favState.data ?? []).map((p) => p.id));

  function handleSelectPeak(peak: Peak) {
    setSelectedPeak(peak);
    router.push(HOME_ROUTE);
  }

  function renderItem({ item }: { item: Peak }) {
    const isFav = favoriteIds.has(item.id);
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => handleSelectPeak(item)}
        style={[styles.item, { backgroundColor: colors.surface, borderColor: isFav ? colors.accent : colors.border }]}
      >
        <View style={styles.itemLeft}>
          <View style={[styles.altBadge, { backgroundColor: colors.accent + '22' }]}>
            <Text style={{ color: colors.accent, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }}>
              {item.altitude} m
            </Text>
          </View>
          <Text style={{ color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm, flexShrink: 1 }}>
            {item.name}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: isFav ? colors.accent : colors.accent + '22' }]}
          onPress={() => isFav ? removeFavorite(item.id) : addFavorite(item.id)}
          accessibilityLabel={i18n.t(isFav ? 'search.removeFavorite' : 'search.addFavorite')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? colors.surface : colors.accent} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  function renderContent() {
    if (query.length < 2) {
      return (
        <View style={styles.hint}>
          <Ionicons name="search-outline" size={32} color={colors.textDisabled} style={{ marginBottom: spacing.sm }} />
          <Text style={{ color: colors.textDisabled, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, textAlign: 'center' }}>
            {i18n.t('search.minChars')}
          </Text>
        </View>
      );
    }

    if (state.status === 'loading') {
      return (
        <View style={styles.hint}>
          <ActivityIndicator color={colors.accent} />
        </View>
      );
    }

    if (state.status === 'error') {
      return (
        <View style={styles.hint}>
          <Ionicons name="cloud-offline-outline" size={32} color={colors.textDisabled} style={{ marginBottom: spacing.sm }} />
          <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, textAlign: 'center' }}>
            {state.error ?? i18n.t('common.error')}
          </Text>
        </View>
      );
    }

    if (state.status === 'success' && (!state.data || state.data.length === 0)) {
      return (
        <View style={styles.hint}>
          <Ionicons name="telescope-outline" size={32} color={colors.textDisabled} style={{ marginBottom: spacing.sm }} />
          <Text style={{ color: colors.textDisabled, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, textAlign: 'center' }}>
            {i18n.t('search.noResults')}
          </Text>
        </View>
      );
    }

    const sorted = [...(state.data ?? [])].sort((a, b) => {
      const aFav = favoriteIds.has(a.id) ? 0 : 1;
      const bFav = favoriteIds.has(b.id) ? 0 : 1;
      return aFav - bFav;
    });

    return (
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.sm }]}>
        <Ionicons name="search-outline" size={18} color={colors.textDisabled} style={styles.searchIcon} />
        <TextInput
          style={[styles.input, { color: colors.textPrimary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm }]}
          placeholder={i18n.t('search.placeholder')}
          placeholderTextColor={colors.textDisabled}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>
      <View style={styles.results}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  searchIcon: { flexShrink: 0 },
  input: { flex: 1, height: 46 },
  results: { flex: 1 },
  hint: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, marginTop: -48 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  itemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  altBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
