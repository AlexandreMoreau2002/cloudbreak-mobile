/**
 * PeakHeader — en-tête du sommet sélectionné avec actions favori et partage.
 */
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { Peak } from '@/services/mockData/types';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type PeakHeaderProps = {
  peak: Peak;
  starred: boolean;
  onToggleFavorite: (peakId: string) => void;
  onShare: (slug: string | null) => void;
};

export function PeakHeader({ peak, starred, onToggleFavorite, onShare }: PeakHeaderProps) {
  const { colors, typography } = useTheme();

  return (
    <View style={styles.peakHeader}>
      <View style={styles.peakHeaderLeft}>
        <Text
          style={[
            styles.peakHeaderName,
            {
              color: colors.textPrimary,
              fontFamily: typography.fontFamily.bold,
              fontSize: typography.fontSize.lg,
            },
          ]}
          numberOfLines={1}
        >
          {peak.name}
        </Text>
        <Text
          style={[
            styles.peakHeaderAlt,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.fontSize.sm,
            },
          ]}
        >
          {peak.altitude} m
        </Text>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          testID="favorite-toggle-button"
          onPress={() => onToggleFavorite(peak.id)}
          activeOpacity={0.7}
          style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons
            name={starred ? 'star' : 'star-outline'}
            size={18}
            color={starred ? colors.accent : colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          testID="share-button"
          onPress={() => onShare(peak.slug)}
          activeOpacity={0.7}
          style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
