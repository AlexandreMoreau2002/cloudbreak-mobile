import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/utils/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Peak } from '@/services/mockData/types';

export default function FavoritesScreen() {
  const { colors, typography, spacing } = useTheme();
  const { state, removeFavorite, refresh } = useFavorites();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  function renderItem({ item }: { item: Peak }) {
    return (
      <View style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
      </View>
    );
  }

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.textDisabled} style={{ marginBottom: spacing.md }} />
        <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, textAlign: 'center' }}>
          {state.error ?? i18n.t('common.error')}
        </Text>
      </View>
    );
  }

  if (!state.data || state.data.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="heart-outline" size={48} color={colors.textDisabled} style={{ marginBottom: spacing.md }} />
        <Text style={{ color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
          {i18n.t('favorites.empty')}
        </Text>
        <Text style={{ color: colors.textDisabled, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, textAlign: 'center', marginTop: spacing.sm }}>
          {i18n.t('favorites.emptyHint')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={state.data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 56 },
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
