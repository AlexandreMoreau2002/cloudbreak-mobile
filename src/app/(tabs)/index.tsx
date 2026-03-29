/**
 * HomeScreen — écran principal, affiche le score mer de nuage du sommet sélectionné.
 */
import i18n from '@/utils/i18n';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useWeekData } from '@/hooks/useWeekData';
import { useTheme } from '@/contexts/ThemeContext';
import { ScoreCard } from '@/components/ScoreCard';
import { WeekStrip } from '@/components/WeekStrip';
import { useRouter, type Href } from 'expo-router';
import { useFavorites } from '@/hooks/useFavorites';
import { PeakHeader } from '@/components/PeakHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { FavoritesGrid } from '@/components/FavoritesGrid';
import { ScoreSkeleton } from '@/components/ScoreSkeleton';
import { useSelectedPeak } from '@/contexts/SelectedPeakContext';
import { localizeScoreResponse } from '@/services/mockData/score';
import { ConditionsSection } from '@/components/ConditionsSection';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Peak, ScoreResponse } from '@/services/mockData/types';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const SEARCH_ROUTE = '/(tabs)/search' as Href;

export function getShareForecastUrl(slug: string | null): string | null {
  return slug ? `reminder_modify_before_mep@cloudbreak.com/sommet/${slug}` : null;
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
  const { selectedPeak, setSelectedPeak, selectedDate, selectedHour, setSelectedDate, setSelectedHour } = useSelectedPeak();

  const token = session?.access_token ?? null;
  const { data: weekData, loading: weekLoading, error: weekError } = useWeekData(selectedPeak?.id ?? null, token);

  // Auto-sync selectedDate + selectedHour — corrige si la date ou l'heure n'a pas de données
  useEffect(() => {
    if (!weekData) return;
    const today = new Date().toISOString().slice(0, 10);
    // 1. Date : revenir à aujourd'hui si absente
    const hasDateData = weekData.byDate[selectedDate] && Object.keys(weekData.byDate[selectedDate]).length > 0;
    const effectiveDate = hasDateData ? selectedDate : today;
    if (!hasDateData) setSelectedDate(effectiveDate);
    // 2. Heure : si le créneau sélectionné n'a pas de données, prendre le meilleur
    const hourHasData = weekData.byDate[effectiveDate]?.[selectedHour] != null;
    if (!hourHasData) {
      const best = weekData.bestByDate[effectiveDate];
      const newHour = best && best.score > 0 ? best.hour : 6;
      setSelectedHour(newHour);
    }
  }, [weekData, selectedDate, selectedHour, setSelectedDate, setSelectedHour]);

  const { state: favoritesState, addFavorite, removeFavorite } = useFavorites();
  const favorites: Peak[] = favoritesState.status === 'success' ? favoritesState.data || [] : [];

  function isFavorite(peakId: string): boolean {
    return favorites.some((p) => p.id === peakId);
  }

  function handleGoToSearch() {
    router.push(SEARCH_ROUTE);
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    const best = weekData?.bestByDate[date];
    setSelectedHour(best && best.score > 0 ? best.hour : 6);
  }

  function handleToggleFavorite(peakId: string) {
    /* istanbul ignore next - aucun sommet n'affiche ce bouton */
    if (isFavorite(peakId)) {
      removeFavorite(peakId);
    } else {
      addFavorite(peakId);
    }
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
          <FavoritesGrid favorites={favorites} onSelectPeak={setSelectedPeak} />
        </View>
      );
    }

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

    if (isLoading) {
      return (
        <View style={styles.forecastStack}>
          <PeakHeader peak={selectedPeak} isFavorite={isFavorite(selectedPeak.id)} onToggleFavorite={handleToggleFavorite} onShare={shareForecast} />
          <ScoreSkeleton />
        </View>
      );
    }

    if (displayScore) {
      return (
        <View style={[styles.forecastStack, isRefreshing && { opacity: 0.7 }]}>
          <PeakHeader peak={selectedPeak} isFavorite={isFavorite(selectedPeak.id)} onToggleFavorite={handleToggleFavorite} onShare={shareForecast} />
          <ScoreCard
            score={displayScore}
            date={selectedDate}
            contextMessage={displayScore.context_message}
            selectedHour={selectedHour}
            onSelectHour={setSelectedHour}
          />
          <WeekStrip selectedDate={selectedDate} onSelectDate={handleSelectDate} dayScores={weekData?.bestByDate} />
          <ConditionsSection score={displayScore} />
          <FavoritesGrid favorites={favorites} onSelectPeak={setSelectedPeak} />
        </View>
      );
    }

    if (weekError) {
      const message = weekError.includes('indisponible')
        ? i18n.t('home.serviceUnavailable')
        : i18n.t('home.errorGeneric');
      return (
        <View style={styles.forecastStack}>
          <PeakHeader peak={selectedPeak} isFavorite={isFavorite(selectedPeak.id)} onToggleFavorite={handleToggleFavorite} onShare={shareForecast} />
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
});
