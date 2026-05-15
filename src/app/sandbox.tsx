import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { CloudLayerViz } from '@/components/cloud-layer-viz';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MOCK_SCORE_HIGH, MOCK_SCORE_MEDIUM } from '@/services/mockData/score';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SandboxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={20} color={colors.accent} />
        <Text style={[styles.backLabel, { color: colors.accent, fontFamily: typography.fontFamily.regular }]}>
          Retour
        </Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>
        CloudLayerViz
      </Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          Variante A · sommet au-dessus
        </Text>
        <CloudLayerViz viz={MOCK_SCORE_HIGH.cloud_layer_viz!} variant="focus" showVariantLabel />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          Variante B · marge serrée
        </Text>
        <CloudLayerViz viz={MOCK_SCORE_MEDIUM.cloud_layer_viz!} variant="ridge" showVariantLabel />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          Variante C · nuage couvrant
        </Text>
        <CloudLayerViz
          viz={{ ...MOCK_SCORE_HIGH.cloud_layer_viz!, cloud_base: 2600 }}
          variant="minimal"
          showVariantLabel
        />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          Variante D · ciel dégagé (WIP)
        </Text>
        <CloudLayerViz
          viz={{ summit_altitude: 476, cloud_base: 5000, pressure_levels: [] }}
          isSunny
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 48, gap: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  backLabel: { fontSize: 15 },
  title: { fontSize: 28, marginBottom: 4 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  label: { fontSize: 13 },
});
