/**
 * ConditionsSkeleton — skeleton loader pour ConditionsSection.
 * Reproduit le label de section et les 3 widgets cartes (humidite/vent/inversion),
 * chacun avec 2 lignes (label + valeur) comme le vrai composant.
 * N'inclut pas la carte d'alerte optionnelle (conditionnelle au verdict, non presumable au loading).
 */
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { SkeletonBlock, useSkeletonColor } from '@/components/skeleton-block';

const WIDGET_COUNT = 3;

export function ConditionsSkeleton() {
  const { colors } = useTheme();
  const blockColor = useSkeletonColor();

  return (
    <View testID="conditions-skeleton" style={styles.conditionsSection}>
      <SkeletonBlock width={100} height={12} color={blockColor} />
      <View style={styles.widgetsRow}>
        {Array.from({ length: WIDGET_COUNT }, (_, i) => (
          <View
            key={i}
            testID={`conditions-skeleton-widget-${i}`}
            style={[styles.widget, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <SkeletonBlock width={50} height={10} color={blockColor} />
            <SkeletonBlock width={40} height={14} color={blockColor} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conditionsSection: {
    gap: 12,
  },
  widgetsRow: {
    flexDirection: 'row',
    gap: 10,
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
});
