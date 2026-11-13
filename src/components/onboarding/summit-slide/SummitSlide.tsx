/**
 * SummitSlide — deuxième écran de l'onboarding narratif (prototype `CBOnb2`).
 *
 * Structure :
 *  - sur-titre + titre + corps (même échelle typographique que `WelcomeSlide`)
 *  - champ de recherche debounced (`useOnboardingPeaks`) : requête >= 2 caractères
 *    bascule la liste affichée des 6 sommets curés vers les résultats de recherche
 *  - liste scrollable de sommets sélectionnables (radio 28px + nom + `range · altitude`),
 *    fondu bas via `LinearGradient` pour signaler le scroll
 *  - dock bas : `MascotBreadcrumb active={1}` + CTA « Continuer »
 *
 * Les erreurs et listes vides sont explicites, avec reprise possible. Le CTA permet
 * toujours de poursuivre sans choisir de sommet.
 *
 * Choix design — champ `range` (design) vs `region` (API `Peak`) :
 *  `Peak` n'expose pas de champ `range` (massif). On affiche `region` quand l'API le
 *  renseigne, sinon on retombe sur `CURATED_PEAKS` (matché par `slug`) pour retrouver le
 *  massif des 6 sommets emblématiques.
 */
import Svg, { Path } from 'react-native-svg';
import { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import i18n from '@/utils/i18n';
import { track } from '@/services/analytics';
import { useTheme } from '@/contexts/ThemeContext';
import { ErrorState } from '@/components/error-state';
import { EmptyState } from '@/components/empty-state';
import type { Peak } from '@/services/mockData/types';
import { OnboardingCta } from '@/components/onboarding/cta';
import { SkeletonBlock } from '@/components/skeleton-block';
import { CURATED_PEAKS } from '@/constants/onboardingPeaks';
import { useSelectedPeak } from '@/contexts/SelectedPeakContext';
import { useOnboardingPeaks } from '@/hooks/onboarding/useOnboardingPeaks';
import { MascotBreadcrumb } from '@/components/onboarding/mascot-breadcrumb';

export interface SummitSlideProps {
  onContinue: () => void;
}

interface SummitRowInfo {
  slug: string;
  name: string;
  altitude: number;
  rangeLabel: string;
}

function toRowInfo(peak: Peak): SummitRowInfo {
  const rangeLabel = peak.region ?? CURATED_PEAKS.find((c) => c.slug === peak.slug)?.range ?? '';
  return { slug: peak.slug, name: peak.name, altitude: peak.altitude, rangeLabel };
}

function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
      <Path d="M3 8.5L6.5 12L13 4.5" stroke="#FFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SummitSlide({ onContinue }: SummitSlideProps) {
  const { colors, typography } = useTheme();
  const { curated, results, query, setQuery, retry } = useOnboardingPeaks();
  const { setSelectedPeak } = useSelectedPeak();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [isScrollable, setIsScrollable] = useState(false);
  const listAreaHeight = useRef(0);

  useEffect(() => {
    track('onboarding_step_viewed', { step: 2 });
  }, []);

  const isSearching = query.length >= 2;
  const activeState = isSearching ? results : curated;
  const selectablePeaks = activeState.status === 'success' ? activeState.data : null;

  function handleSelect(slug: string) {
    if (!selectablePeaks) return;
    setSelectedSlug(slug);
  }

  function handleContinue() {
    if (selectablePeaks && selectedSlug) {
      const peak = selectablePeaks.find((p) => p.slug === selectedSlug) ?? null;
      if (peak) {
        track('peak_selected', { peak_id: peak.id, source: 'onboarding' });
        setSelectedPeak(peak);
      }
    }
    onContinue();
  }

  function renderRow(info: SummitRowInfo) {
    const isSelected = selectedSlug === info.slug;
    return (
      <Pressable
        key={info.slug}
        testID={`summit-row-${info.slug}`}
        onPress={() => handleSelect(info.slug)}
        style={[
          styles.row,
          {
            backgroundColor: colors.surface,
            borderColor: isSelected ? colors.accent : colors.border,
          },
        ]}
      >
        <View
          testID={isSelected ? `summit-row-${info.slug}-selected` : undefined}
          style={[
            styles.radio,
            {
              borderColor: isSelected ? colors.accent : colors.border,
              backgroundColor: isSelected ? colors.accent : 'transparent',
            },
          ]}
        >
          {isSelected ? <CheckIcon /> : null}
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowName, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold }]}>
            {info.name}
          </Text>
          <Text
            style={[
              styles.rowEyebrow,
              { color: colors.textDisabled, fontFamily: typography.fontFamily.semiBold },
            ]}
          >
            {`${info.rangeLabel} · ${info.altitude} m`}
          </Text>
        </View>
      </Pressable>
    );
  }

  function renderList() {
    const isLoading = activeState.status === 'loading';
    if (isLoading) {
      return (
        <View>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock
              key={i}
              testID="summit-skeleton-row"
              width="100%"
              height={60}
              color={colors.border}
              style={styles.skeletonRow}
            />
          ))}
        </View>
      );
    }

    if (activeState.status === 'error') {
      return <ErrorState title={i18n.t('onboarding.peaksError')} action={{ label: i18n.t('common.retry'), onPress: retry }} actionTestID="summit-retry" />;
    }
    if (selectablePeaks?.length === 0) {
      return <EmptyState icon="search-outline" title={i18n.t('onboarding.peaksEmpty')} />;
    }
    if (selectablePeaks) {
      return <View>{selectablePeaks.map((p) => renderRow(toRowInfo(p)))}</View>;
    }

    return null;
  }

  return (
    <View style={styles.root}>
      {__DEV__ ? (
        <Text
          style={[styles.eyebrow, { color: colors.textDisabled, fontFamily: typography.fontFamily.semiBold }]}
        >
          {i18n.t('onboarding.step2Eyebrow')}
        </Text>
      ) : null}

      <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.light }]}>
        {i18n.t('onboarding.step2Title')}
      </Text>

      <Text style={[styles.body, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {i18n.t('onboarding.step2Body')}
      </Text>

      <TextInput
        testID="summit-search"
        value={query}
        onChangeText={setQuery}
        placeholder={i18n.t('onboarding.step2SearchPlaceholder')}
        placeholderTextColor={colors.textDisabled}
        autoCorrect={false}
        autoCapitalize="none"
        style={[
          styles.search,
          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary },
        ]}
      />

      <View
        testID="summit-list-area"
        style={styles.listArea}
        onLayout={(event) => {
          listAreaHeight.current = event.nativeEvent.layout.height;
        }}
      >
        <ScrollView
          testID="summit-list-scroll"
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={(_width, height) => {
            setIsScrollable(height > listAreaHeight.current);
          }}
        >
          {renderList()}
        </ScrollView>
        {isScrollable ? (
          <LinearGradient
            testID="summit-list-fade"
            pointerEvents="none"
            colors={['transparent', colors.background]}
            style={styles.fade}
          />
        ) : null}
      </View>

      <View style={styles.dock}>
        <MascotBreadcrumb active={1} total={4} />
        <View style={styles.dockSpacer} />
        <OnboardingCta
          label={i18n.t('onboarding.continue')}
          onPress={handleContinue}
          showArrow
          testID="summit-continue"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    lineHeight: 31,
    letterSpacing: -0.56,
    marginBottom: 14,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  search: {
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  listArea: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    paddingBottom: 16,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 28,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 14,
  },
  rowEyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  skeletonRow: {
    marginBottom: 8,
    borderRadius: 14,
  },
  dock: {
    flexShrink: 0,
    paddingTop: 12,
  },
  dockSpacer: {
    height: 8,
  },
});
