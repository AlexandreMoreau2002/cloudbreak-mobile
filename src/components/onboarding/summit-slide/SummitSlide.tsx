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
 * Dérogation `AsyncStateView` (voir `mobile/CLAUDE.md`) : volontairement PAS utilisé ici.
 * En cas d'erreur réseau sur les sommets curés (offline), l'écran ne bloque jamais —
 * il retombe sur `CURATED_PEAKS` (fallback statique embarqué) avec des lignes non
 * sélectionnables et un CTA toujours actif qui avance sans committer de sommet. C'est le
 * même esprit que la règle "carte quota jamais bloquante" : une erreur ici ne doit pas
 * empêcher l'utilisateur de terminer l'onboarding.
 *
 * Choix design — champ `range` (design) vs `region` (API `Peak`) :
 *  `Peak` n'expose pas de champ `range` (massif). On affiche `region` quand l'API le
 *  renseigne, sinon on retombe sur `CURATED_PEAKS` (matché par `slug`) pour retrouver le
 *  massif des 6 sommets emblématiques. Pour la liste statique offline, `CURATED_PEAKS`
 *  fournit directement `range`.
 */
import i18n from '@/utils/i18n';
import { useEffect, useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import { track } from '@/services/analytics';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import type { Peak } from '@/services/mockData/types';
import { OnboardingCta } from '@/components/onboarding/cta';
import { SkeletonBlock } from '@/components/skeleton-block';
import { useSelectedPeak } from '@/contexts/SelectedPeakContext';
import { useOnboardingPeaks } from '@/hooks/onboarding/useOnboardingPeaks';
import { MascotBreadcrumb } from '@/components/onboarding/mascot-breadcrumb';
import { CURATED_PEAKS, type CuratedPeak } from '@/constants/onboardingPeaks';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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

function curatedToRowInfo(peak: CuratedPeak): SummitRowInfo {
  return { slug: peak.slug, name: peak.name, altitude: peak.altitude, rangeLabel: peak.range };
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
  const { curated, results, query, setQuery } = useOnboardingPeaks();
  const { setSelectedPeak } = useSelectedPeak();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  useEffect(() => {
    track('onboarding_step_viewed', { step: 2 });
  }, []);

  const isSearching = query.length >= 2;
  const staticFallback = curated.status === 'error';

  let selectablePeaks: Peak[] | null = null;
  let staticRows: SummitRowInfo[] | null = null;

  if (isSearching && results.status === 'success' && results.data) {
    selectablePeaks = results.data;
  } else if (curated.status === 'success' && curated.data) {
    selectablePeaks = curated.data;
  } else if (staticFallback) {
    staticRows = CURATED_PEAKS.map(curatedToRowInfo);
  }

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

  function renderRow(info: SummitRowInfo, selectable: boolean) {
    const isSelected = selectable && selectedSlug === info.slug;
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
    const isLoading = isSearching ? results.status === 'loading' : curated.status === 'loading';
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

    if (selectablePeaks) {
      return <View>{selectablePeaks.map((p) => renderRow(toRowInfo(p), true))}</View>;
    }

    if (staticRows) {
      return (
        <View testID="summit-static-list">{staticRows.map((info) => renderRow(info, false))}</View>
      );
    }

    return null;
  }

  return (
    <View style={styles.root}>
      <Text
        style={[styles.eyebrow, { color: colors.textDisabled, fontFamily: typography.fontFamily.semiBold }]}
      >
        {i18n.t('onboarding.step2Eyebrow')}
      </Text>

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

      <View style={styles.listArea}>
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {renderList()}
        </ScrollView>
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', colors.background]}
          style={styles.fade}
        />
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
