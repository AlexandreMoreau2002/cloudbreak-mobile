/**
 * HomeScreen — écran principal, affiche le score mer de nuage du sommet sélectionné.
 */
import i18n from '@/utils/i18n';
import { useScore } from '@/hooks/useScore';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ScoreCard } from '@/components/ScoreCard';
import { useRouter, type Href } from 'expo-router';
import { ScoreSkeleton } from '@/components/ScoreSkeleton';
import { useSelectedPeak } from '@/contexts/SelectedPeakContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const SEARCH_ROUTE = '/(tabs)/search' as Href;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { colors, typography, spacing } = useTheme();
  const { selectedPeak, selectedDate, selectedHour } = useSelectedPeak();

  const token = session?.access_token ?? null;
  const scoreState = useScore(selectedPeak?.id ?? null, selectedDate, selectedHour, token);

  function handleGoToSearch() {
    router.push(SEARCH_ROUTE);
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
        </View>
      );
    }

    if (scoreState.status === 'loading') {
      return (
        <View style={styles.cardWrapper}>
          <ScoreSkeleton />
        </View>
      );
    }

    if (scoreState.status === 'error') {
      const message = scoreState.error?.includes('indisponible')
        ? i18n.t('home.serviceUnavailable')
        : i18n.t('home.errorGeneric');
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textDisabled} style={{ marginBottom: spacing.md }} />
          <Text style={[styles.emptyHint, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, textAlign: 'center' }]}>
            {message}
          </Text>
        </View>
      );
    }

    if (scoreState.status === 'success' && scoreState.data) {
      return (
        <View style={styles.cardWrapper}>
          <ScoreCard score={scoreState.data} date={selectedDate} />
        </View>
      );
    }

    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.appTitle, { color: colors.accent, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.xl }]}>
          {i18n.t('home.title')}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 16,
    alignItems: 'center',
  },
  appTitle: {
    letterSpacing: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
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
  },
  ctaText: {
    letterSpacing: 1,
  },
  cardWrapper: {
    width: '100%',
  },
});
