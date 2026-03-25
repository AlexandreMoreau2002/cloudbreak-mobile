/**
 * HomeScreen — écran principal, affiche le score mer de nuage du sommet sélectionné.
 */
import { useEffect, useRef } from 'react';
import i18n from '@/utils/i18n';
import { useScore } from '@/hooks/useScore';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ScoreCard } from '@/components/ScoreCard';
import { WeekStrip } from '@/components/WeekStrip';
import { useRouter, type Href } from 'expo-router';
import { ScoreSkeleton } from '@/components/ScoreSkeleton';
import { useFavorites } from '@/hooks/useFavorites';
import { useWeekScores } from '@/hooks/useWeekScores';
import { useSelectedPeak } from '@/contexts/SelectedPeakContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Peak, ScoreResponse } from '@/services/mockData/types';

const SEARCH_ROUTE = '/(tabs)/search' as Href;

export function getShareForecastUrl(slug: string | null): string | null {
  return slug ? `https://merdenua.ge/sommet/${slug}` : null;
}

export async function shareForecast(
  slug: string | null,
  shareImpl?: typeof Share.share,
  alertImpl?: typeof Alert.alert,
): Promise<void> {
  const shareUrl = getShareForecastUrl(slug);
  if (!shareUrl) {
    return;
  }

  const resolvedShareImpl = shareImpl ?? Share.share;
  const resolvedAlertImpl = alertImpl ?? Alert.alert;

  try {
    await resolvedShareImpl({
      message: shareUrl,
      url: shareUrl,
    });
  } catch {
    resolvedAlertImpl(i18n.t('home.shareFailedTitle'), shareUrl);
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { colors, typography, spacing } = useTheme();
  const { selectedPeak, setSelectedPeak, selectedDate, selectedHour, setSelectedDate, setSelectedHour } = useSelectedPeak();

  const token = session?.access_token ?? null;
  const scoreState = useScore(selectedPeak?.id ?? null, selectedDate, selectedHour, token);
  const weekScores = useWeekScores(selectedPeak?.id ?? null, selectedHour, token);

  // Stale-while-revalidate : garde les dernières données valides par sommet
  const lastScoreRef = useRef<{ peakId: string; data: ScoreResponse } | null>(null);

  useEffect(() => {
    if (scoreState.status === 'success' && scoreState.data && selectedPeak) {
      lastScoreRef.current = { peakId: selectedPeak.id, data: scoreState.data };
    }
  }, [scoreState, selectedPeak]);

  const { state: favoritesState, addFavorite, removeFavorite } = useFavorites();
  const favorites: Peak[] = favoritesState.status === 'success' ? favoritesState.data || [] : [];

  function isFavorite(peakId: string): boolean {
    return favorites.some((p) => p.id === peakId);
  }

  function handleGoToSearch() {
    router.push(SEARCH_ROUTE);
  }

  function handleToggleFavorite(peakId: string) {
    /* istanbul ignore next - aucun sommet n'affiche ce bouton */
    if (isFavorite(peakId)) {
      removeFavorite(peakId);
    } else {
      addFavorite(peakId);
    }
  }

  function renderPeakHeader(peak: Peak) {
    /* istanbul ignore next - le header n'est jamais appelé sans sommet sélectionné */
    const starred = isFavorite(peak.id);
    return (
      <View style={styles.peakHeader}>
        <View style={styles.peakHeaderLeft}>
          <Text style={[styles.peakHeaderName, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.lg }]} numberOfLines={1}>
            {peak.name}
          </Text>
          <Text style={[styles.peakHeaderAlt, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm }]}>
            {peak.altitude} m
          </Text>
        </View>
        <TouchableOpacity
          testID="favorite-toggle-button"
          onPress={() => handleToggleFavorite(peak.id)}
          activeOpacity={0.7}
          style={[styles.favButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons
            name={starred ? 'star' : 'star-outline'}
            size={18}
            color={starred ? colors.accent : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    );
  }

  function renderConditionsSection(score: ScoreResponse) {
    const conditions = score.conditions;
    if (!conditions) return null;

    const humidityVal = conditions.humidity != null ? `${Math.round(conditions.humidity)}%` : (conditions.humidity_pct != null ? `${Math.round(conditions.humidity_pct)}%` : 'N/A');
    const windVal = conditions.wind_speed != null ? `${Math.round(conditions.wind_speed)} km/h` : (conditions.wind_speed_kmh != null ? `${Math.round(conditions.wind_speed_kmh)} km/h` : 'N/A');
    const inversionPresent = conditions.inversion_present ?? conditions.inversion_detected ?? null;
    const inversionVal = inversionPresent === true ? 'Oui' : inversionPresent === false ? 'Non' : 'N/A';
    const alertLabel = i18n.t('home.alertCtaTitle');
    const alertSubtitle = i18n.t('home.alertCtaSubtitle');
    const showAlertCta = score.verdict === 'high' || score.verdict === 'medium';

    return (
      <View style={styles.conditionsSection}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }]}>
          {i18n.t('home.conditionsTitle').toUpperCase()}
        </Text>

        <View style={styles.widgetsRow}>
          <View style={[styles.widget, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.widgetLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }]}>
              {i18n.t('home.humidity').toUpperCase()}
            </Text>
            <Text style={[styles.widgetValue, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }]}>
              {humidityVal}
            </Text>
          </View>
          <View style={[styles.widget, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.widgetLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }]}>
              {i18n.t('home.wind').toUpperCase()}
            </Text>
            <Text style={[styles.widgetValue, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }]}>
              {windVal}
            </Text>
          </View>
          <View style={[styles.widget, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.widgetLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }]}>
              {i18n.t('home.inversion').toUpperCase()}
            </Text>
            <Text style={[styles.widgetValue, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }]}>
              {inversionVal}
            </Text>
          </View>
        </View>

        {showAlertCta ? (
          <View style={[styles.alertCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.alertCopy}>
              <View style={styles.alertTitleRow}>
                <Ionicons name="notifications-outline" size={18} color={colors.accent} />
                <Text style={[styles.alertTitle, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }]}>
                  {alertLabel}
                </Text>
              </View>
              <Text style={[styles.alertSubtitle, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }]}>
                {alertSubtitle}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.alertButton, { backgroundColor: colors.accent }]}
              activeOpacity={0.82}
              onPress={() => Alert.alert(alertLabel, alertSubtitle)}
            >
              <Text style={[styles.alertButtonText, { color: colors.surface, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }]}>
                {i18n.t('home.alertCtaButton').toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  }

  function renderFavoritesSection() {
    if (favorites.length === 0) return null;
    return (
      <View style={styles.favoritesSection}>
        <Text style={[styles.favoritesSectionLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }]}>
          {i18n.t('home.sectionFavorites').toUpperCase()}
        </Text>
        <View style={styles.favoritesGrid}>
          {favorites.map((peak) => (
            <TouchableOpacity
              key={peak.id}
              testID={`favorite-peak-${peak.id}`}
              style={[styles.favoritePeakCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setSelectedPeak(peak)}
              activeOpacity={0.8}
            >
              <Text style={[styles.favoritePeakName, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }]} numberOfLines={1}>
                {peak.name}
              </Text>
              <Text style={[styles.favoritePeakAlt, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }]}>
                {peak.altitude} m
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  function renderContent() {
    if (!selectedPeak) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-outline" size={64} color={colors.textDisabled} style={{ marginBottom: spacing.lg }} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.lg }]}>
            {i18n.t('home.selectPeak')}
          </Text>
          <Text style={[styles.emptyHint, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm }]}>
            {i18n.t('home.selectPeakHint')}
          </Text>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.accent }]}
            onPress={handleGoToSearch}
            activeOpacity={0.8}
          >
            <Text style={[styles.ctaText, { color: colors.surface, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }]}>
              {i18n.t('home.goToSearch')}
            </Text>
          </TouchableOpacity>
          {renderFavoritesSection()}
        </View>
      );
    }

    const staleData = lastScoreRef.current?.peakId === selectedPeak.id
      ? lastScoreRef.current.data!
      : null;
    const displayScore = scoreState.status === 'success' ? scoreState.data : staleData;
    const isRefreshing = scoreState.status === 'loading' && displayScore != null;

    if (scoreState.status === 'loading' && !displayScore) {
      return (
        <View style={styles.forecastStack}>
          {renderPeakHeader(selectedPeak)}
          <ScoreSkeleton />
        </View>
      );
    }

    if (displayScore) {
      return (
        <View style={[styles.forecastStack, isRefreshing && { opacity: 0.7 }]}>
          {renderPeakHeader(selectedPeak)}
          <ScoreCard
            score={displayScore}
            date={selectedDate}
            contextMessage={displayScore.context_message}
            selectedHour={selectedHour}
            onSelectHour={setSelectedHour}
          />
          <WeekStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} dayScores={weekScores ?? undefined} />
          {renderConditionsSection(displayScore)}
          {renderFavoritesSection()}
        </View>
      );
    }

    if (scoreState.status === 'error') {
      const message = scoreState.error?.includes('indisponible')
        ? i18n.t('home.serviceUnavailable')
        : i18n.t('home.errorGeneric');
      return (
        <View style={styles.forecastStack}>
          {renderPeakHeader(selectedPeak)}
          <View style={[styles.errorCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.textDisabled} style={{ marginBottom: spacing.sm }} />
            <Text style={[styles.emptyHint, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, textAlign: 'center', marginBottom: 0 }]}>
              {message}
            </Text>
          </View>
        </View>
      );
    }

    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable
          style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleGoToSearch}
        >
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.searchBarText, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {i18n.t('home.searchPlaceholder')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom + 40, 56) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  searchBarText: {
    fontSize: 14,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 520,
    justifyContent: 'center',
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    textAlign: 'center',
    marginBottom: 24,
  },
  ctaButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 32,
  },
  ctaText: {
    letterSpacing: 1,
  },
  forecastStack: {
    width: '100%',
    gap: 22,
    alignSelf: 'center',
    maxWidth: 540,
  },
  peakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  peakHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  peakHeaderName: {
    letterSpacing: 0.5,
  },
  peakHeaderAlt: {},
  favButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  widgetsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  conditionsSection: {
    gap: 12,
  },
  sectionLabel: {
    letterSpacing: 1,
  },
  widget: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 6,
    alignItems: 'center',
  },
  widgetLabel: {
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  widgetValue: {
    textAlign: 'center',
  },
  alertCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  alertCopy: {
    flex: 1,
    gap: 4,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertTitle: {},
  alertSubtitle: {
    lineHeight: 16,
  },
  alertButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  alertButtonText: {
    letterSpacing: 1,
  },
  favoritesSection: {
    gap: 12,
    width: '100%',
  },
  favoritesSectionLabel: {
    letterSpacing: 1,
  },
  favoritesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  favoritePeakCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 4,
  },
  favoritePeakName: {
    letterSpacing: 0.3,
  },
  favoritePeakAlt: {},
  errorCard: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
});
