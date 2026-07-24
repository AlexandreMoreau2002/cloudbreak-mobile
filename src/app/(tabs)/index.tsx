/**
 * HomeScreen — écran principal, affiche le score mer de nuage du sommet sélectionné.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import i18n from '@/utils/i18n';
import { track } from '@/services/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { useWeekData } from '@/hooks/useWeekData';
import { useTheme } from '@/contexts/ThemeContext';
import { ScoreCard } from '@/components/score-card';
import { WeekStrip } from '@/components/week-strip';
import { useFavorites } from '@/hooks/useFavorites';
import { ErrorState } from '@/components/error-state';
import { PeakHeader } from '@/components/peak-header';
import { EmptyState } from '@/components/empty-state';
import { usePaywall } from '@/contexts/PaywallContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { HomeSkeleton } from '@/components/home-skeleton';
import { OfflineBanner } from '@/components/offline-banner';
import { FavoritesGrid } from '@/components/favorites-grid';
import { useSelectedPeak } from '@/contexts/SelectedPeakContext';
import { localizeScoreResponse } from '@/services/mockData/score';
import { ConditionsSection } from '@/components/conditions-section';
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
  useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { colors, typography, spacing } = useTheme();
  const [quotaDismissed, setQuotaDismissed] = useState(false);
  const [lastSuccessfulPeak, setLastSuccessfulPeak] = useState<Peak | null>(null);
  const { selectedPeak, setSelectedPeak, selectedDate, selectedHour, setSelectedDate, setSelectedHour } = useSelectedPeak();

  const token = session?.access_token ?? null;
  const { data: weekData, loading: weekLoading, error: weekError, quotaExceeded, fromCache, cachedAt, refresh } = useWeekData(selectedPeak?.id ?? null, token);

  const { showPaywall } = usePaywall();
  const userClickedHourRef = useRef(false);

  // Sommet différent sélectionné → la carte quota doit pouvoir se réafficher pour lui aussi
  useEffect(() => {
    setQuotaDismissed(false);
  }, [selectedPeak?.id]);

  useEffect(() => {
    if (quotaExceeded) showPaywall('quota');
  }, [quotaExceeded, showPaywall]);

  useEffect(() => {
    if (quotaExceeded && selectedPeak) {
      track('quota_badge_viewed', { peak_id: selectedPeak.id });
    }
  }, [quotaExceeded, selectedPeak]);

  // Auto-sync selectedDate + selectedHour — corrige si la date ou l'heure n'a pas de données
  useEffect(() => {
    if (!weekData) return;
    const today = new Date().toISOString().slice(0, 10);
    const hasDateData = weekData.byDate[selectedDate] && Object.keys(weekData.byDate[selectedDate]).length > 0;
    const effectiveDate = hasDateData ? selectedDate : today;
    if (!hasDateData) setSelectedDate(effectiveDate);
    const hourHasData = weekData.byDate[effectiveDate]?.[selectedHour] != null;
    if (!hourHasData && !userClickedHourRef.current) {
      const best = weekData.bestByDate[effectiveDate];
      const newHour = best && best.score > 0 ? best.hour : 6;
      setSelectedHour(newHour);
    }
    userClickedHourRef.current = false;
  }, [weekData, selectedDate, selectedHour, setSelectedDate, setSelectedHour]);

  const { state: favoritesState, addFavorite, removeFavorite, refresh: refreshFavorites } = useFavorites();
  const favorites: Peak[] = favoritesState.status === 'success' ? favoritesState.data || [] : [];

  // Recharge les favoris à chaque retour sur Home (ex: ajout/suppression depuis
  // l'onglet Favoris) — sans ça la liste affichée sous la prévision peut rester
  // périmée ou vide si le premier chargement a échoué avant que l'écran soit visité.
  useFocusEffect(
    useCallback(() => {
      refreshFavorites();
    }, [refreshFavorites]),
  );

  // Si la date sélectionnée n'a pas de données (cache périmé / date hors fenêtre),
  // on se rabat sur aujourd'hui
  const today = new Date().toISOString().slice(0, 10);
  const effectiveDate =
    weekData && (!weekData.byDate[selectedDate] || Object.keys(weekData.byDate[selectedDate]).length === 0)
      ? today
      : selectedDate;
  const rawDisplayScore: ScoreResponse | null = weekData?.byDate[effectiveDate]?.[selectedHour] ?? null;
  const displayScore: ScoreResponse | null = rawDisplayScore
    ? localizeScoreResponse(rawDisplayScore)
    : null;
  const isLoading = weekLoading && displayScore == null;
  const isRefreshing = weekLoading && displayScore != null;

  // Retient le dernier sommet affiché avec succès — permet d'y revenir si un
  // sommet sans cache tombe sur le quota (voir handleDismissQuota)
  useEffect(() => {
    if (displayScore && selectedPeak) {
      setLastSuccessfulPeak(selectedPeak);
    }
  }, [displayScore, selectedPeak]);

  function isFavorite(peakId: string): boolean {
    return favorites.some((p) => p.id === peakId);
  }

  function handleGoToSearch() {
    router.push(SEARCH_ROUTE);
  }

  function handleSelectDate(date: string, method: 'tap' | 'swipe') {
    track('score_date_changed', { date, method });
    setSelectedDate(date);
    const best = weekData?.bestByDate[date];
    setSelectedHour(best && best.score > 0 ? best.hour : 6);
  }

  function handleSelectFavoritePeak(peak: Peak) {
    track('peak_selected', { peak_id: peak.id, source: 'home_favorites' });
    setSelectedPeak(peak);
  }

  /* istanbul ignore next - le bouton partage n'est rendu que si un sommet est sélectionné */
  function handleShare() {
    if (selectedPeak) track('forecast_shared', { peak_id: selectedPeak.id });
    return shareForecast(selectedPeak?.slug ?? null);
  }

  function handleToggleFavorite(peakId: string) {
    /* istanbul ignore next - aucun sommet n'affiche ce bouton */
    if (isFavorite(peakId)) {
      removeFavorite(peakId);
    } else {
      addFavorite(peakId);
    }
  }

  function handleDismissQuota() {
    /* istanbul ignore next - la carte quota n'est rendue que si un sommet est sélectionné */
    if (selectedPeak) track('quota_dismissed', { peak_id: selectedPeak.id });
    // Pas de cache pour ce sommet mais un autre a déjà été chargé avec succès
    // aujourd'hui → on y revient plutôt que d'afficher une erreur trompeuse
    if (!displayScore && lastSuccessfulPeak && lastSuccessfulPeak.id !== selectedPeak?.id) {
      setSelectedPeak(lastSuccessfulPeak);
      return;
    }
    setQuotaDismissed(true);
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
          <FavoritesGrid favorites={favorites} onSelectPeak={handleSelectFavoritePeak} />
        </View>
      );
    }

    if (isLoading) {
      return (
        <View style={styles.forecastStack}>
          <HomeSkeleton />
        </View>
      );
    }

    if (displayScore) {
      return (
        <View style={[styles.forecastStack, isRefreshing && { opacity: 0.7 }]}>
          {fromCache && cachedAt ? <OfflineBanner cachedAt={cachedAt} /> : null}
          <PeakHeader peak={selectedPeak} isFavorite={isFavorite(selectedPeak.id)} onToggleFavorite={handleToggleFavorite} onShare={handleShare} />
          <ScoreCard
            score={displayScore}
            date={selectedDate}
            contextMessage={displayScore.context_message}
            selectedHour={selectedHour}
            onSelectHour={(h) => { userClickedHourRef.current = true; setSelectedHour(h); }}
          />
          {quotaExceeded ? (
            <TouchableOpacity
              testID="quota-counter-badge"
              style={[styles.quotaCounterBadge, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={() => showPaywall('home_badge')}
              activeOpacity={0.8}
            >
              <Text style={[styles.quotaCounterText, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }]}>
                {i18n.t('paywall.quotaCounterNone')}
              </Text>
            </TouchableOpacity>
          ) : null}
          <WeekStrip selectedDate={selectedDate} onSelectDate={handleSelectDate} dayScores={weekData?.bestByDate} />
          <ConditionsSection score={displayScore} />
          <FavoritesGrid favorites={favorites} onSelectPeak={handleSelectFavoritePeak} />
        </View>
      );
    }

    if (weekError) {
      if (weekError === 'QUOTA_EXCEEDED') {
        if (!quotaDismissed) {
          return (
            <View style={styles.forecastStack}>
              <PeakHeader peak={selectedPeak} isFavorite={isFavorite(selectedPeak.id)} onToggleFavorite={handleToggleFavorite} onShare={handleShare} />
              <View style={[styles.errorCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <ErrorState
                  icon="lock-closed-outline"
                  title={i18n.t('paywall.quotaTitle')}
                  message={i18n.t('home.quotaUpgrade')}
                  action={{ label: i18n.t('home.discoverPro'), onPress: () => showPaywall('quota') }}
                  actionTestID="quota-open-paywall-button"
                  secondaryAction={{ label: i18n.t('home.notNow'), onPress: handleDismissQuota }}
                />
              </View>
            </View>
          );
        }

        // Dismiss sans cache pour ce sommet ni sommet précédent à proposer :
        // état neutre honnête (quota), jamais l'erreur réseau générique
        return (
          <View style={styles.forecastStack}>
            <PeakHeader peak={selectedPeak} isFavorite={isFavorite(selectedPeak.id)} onToggleFavorite={handleToggleFavorite} onShare={handleShare} />
            <View style={[styles.errorCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <ErrorState
                icon="cloud-outline"
                title={i18n.t('home.quotaNoCacheTitle')}
                message={i18n.t('home.quotaNoCacheMessage')}
                action={{ label: i18n.t('home.goToSearch'), onPress: handleGoToSearch }}
              />
            </View>
          </View>
        );
      }

      if (weekError === 'OFFLINE_NO_CACHE') {
        return (
          <View style={styles.forecastStack}>
            <PeakHeader peak={selectedPeak} isFavorite={isFavorite(selectedPeak.id)} onToggleFavorite={handleToggleFavorite} onShare={handleShare} />
            <EmptyState
              icon="cloud-offline-outline"
              title={i18n.t('home.offlineNoCacheTitle')}
              subtitle={i18n.t('home.offlineNoCacheMessage')}
            />
          </View>
        );
      }

      return (
        <View style={styles.forecastStack}>
          <PeakHeader peak={selectedPeak} isFavorite={isFavorite(selectedPeak.id)} onToggleFavorite={handleToggleFavorite} onShare={handleShare} />
          <View style={[styles.errorCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <ErrorState
              title={i18n.t('home.errorGeneric')}
              message={i18n.t('common.networkHint')}
            />
          </View>
        </View>
      );
    }

    // Filet de sécurité : weekData existe mais heure sans données (cache partiel) → skeleton le temps du redirect
    if (weekData) {
      return (
        <View style={styles.forecastStack}>
          <HomeSkeleton />
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
        testID="home-scroll-view"
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom + 40, 56) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            testID="home-refresh-control"
            refreshing={weekLoading && (fromCache || weekError === 'OFFLINE_NO_CACHE')}
            onRefresh={refresh}
            tintColor={colors.accent}
          />
        }
      >
        {renderContent()}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 8,
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
    paddingTop: 8,
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
    gap: 12,
    alignSelf: 'center',
    maxWidth: 540,
  },
  errorCard: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
  quotaCounterBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignSelf: 'center',
  },
  quotaCounterText: {
    textAlign: 'center',
  },
});
