import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import i18n from '@/utils/i18n';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { track } from '@/services/analytics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { useFavorites } from '@/hooks/useFavorites';
import type { Peak } from '@/services/mockData/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { AsyncStateView } from '@/components/async-state-view';
import { useFocusEffect } from '@react-navigation/native';
import { FavoritesSkeleton } from '@/components/favorites-skeleton';
import { useSelectedPeak } from '@/contexts/SelectedPeakContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HOME_ROUTE = '/(tabs)/' as Href;
const SEARCH_ROUTE = '/(tabs)/search' as Href;

export default function FavoritesScreen() {
  useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing } = useTheme();
  const { state, removeFavorite, refresh } = useFavorites();
  const { setSelectedPeak } = useSelectedPeak();

  function handleSelectPeak(peak: Peak) {
    track('peak_selected', { peak_id: peak.id, source: 'favorites' });
    setSelectedPeak(peak);
    router.push(HOME_ROUTE);
  }

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  function renderItem({ item }: { item: Peak }) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => handleSelectPeak(item)}
        style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}
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
          style={[styles.removeButton, { backgroundColor: colors.border }]}
          onPress={() => removeFavorite(item.id)}
          accessibilityLabel={i18n.t('favorites.remove')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  const data = state.status === 'success' ? (state.data ?? []) : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <AsyncStateView
        isLoading={state.status === 'loading' || state.status === 'idle'}
        isEmpty={state.status === 'success' && data.length === 0}
        error={state.status === 'error' ? (state.error ?? i18n.t('common.error')) : null}
        loadingComponent={<FavoritesSkeleton />}
        emptyComponent={
          <View style={styles.centered}>
            <EmptyState
              icon="heart-outline"
              title={i18n.t('favorites.empty')}
              subtitle={i18n.t('favorites.emptyHint')}
              ctaLabel={i18n.t('favorites.goToSearch')}
              onCta={() => router.push(SEARCH_ROUTE)}
            />
          </View>
        }
        errorComponent={
          <View style={styles.centered}>
            <ErrorState
              title={i18n.t('favorites.errorTitle')}
              message={i18n.t('common.networkHint')}
              action={{ label: i18n.t('common.retry'), onPress: refresh }}
            />
          </View>
        }
      >
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          showsVerticalScrollIndicator={false}
        />
      </AsyncStateView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
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
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
