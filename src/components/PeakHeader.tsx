/**
 * PeakHeader — entete editoriale du sommet sur la Home.
 *
 * Ce composant affiche :
 * - le nom du sommet
 * - la ligne secondaire `altitude · region` si la region existe
 * - l'action favori via l'etoile a droite
 * - l'action share via le bouton partage
 *
 * Props :
 *   peak              Peak              — sommet courant
 *   isFavorite        boolean           — etat favori actuel
 *   onToggleFavorite  (peakId) => void  — callback de bascule favori
 *   onShare           (slug) => void    — callback partage deep link
 */
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { Peak } from '@/services/mockData/types';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface PeakHeaderProps {
  peak: Peak;
  isFavorite: boolean;
  onToggleFavorite: (peakId: string) => void;
  onShare?: (slug: string) => void;
}

export function PeakHeader({ peak, isFavorite, onToggleFavorite, onShare }: PeakHeaderProps) {
  const { colors, typography } = useTheme();

  return (
    <View style={styles.peakHeader}>
      <View style={styles.peakHeaderLeft}>
        <Text
          style={[styles.peakHeaderName, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.lg }]}
          numberOfLines={1}
        >
          {peak.name}
        </Text>
        <Text style={[styles.peakHeaderAlt, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm }]}>
          {peak.altitude} m{peak.region ? ` · ${peak.region}` : ''}
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
            name={isFavorite ? 'star' : 'star-outline'}
            size={18}
            color={isFavorite ? colors.accent : colors.textSecondary}
          />
        </TouchableOpacity>
        {onShare ? (
          <TouchableOpacity
            testID="share-button"
            onPress={() => onShare(peak.slug)}
            activeOpacity={0.7}
            style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons
              name="share-social-outline"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
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
