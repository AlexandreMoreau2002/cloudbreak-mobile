import i18n from '@/utils/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { CloudLayerViz } from '@/components/CloudLayerViz';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MOCK_SCORE_HIGH, MOCK_SCORE_MEDIUM } from '@/services/mockData/score';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const { colors, typography, scheme, toggleScheme } = useTheme();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.semiBold }}>
        {i18n.t('profile.comingSoon')}
      </Text>

      <TouchableOpacity style={[styles.button, { borderColor: colors.accent, backgroundColor: colors.surface }]} onPress={toggleScheme}>
        <Text style={{ color: colors.accent, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
          {scheme === 'light' ? i18n.t('profile.darkMode') : i18n.t('profile.lightMode')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { borderColor: colors.border }]} onPress={signOut}>
        <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm }}>
          {i18n.t('profile.signOut')}
        </Text>
      </TouchableOpacity>

      <View style={styles.sandbox}>
        <Text style={[styles.sandboxTitle, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold }]}>
          CloudLayerViz Sandbox
        </Text>

        <View style={[styles.sandboxCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sandboxLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Variante A · sommet au-dessus
          </Text>
          <CloudLayerViz viz={MOCK_SCORE_HIGH.cloud_layer_viz!} variant="focus" showVariantLabel />
        </View>

        <View style={[styles.sandboxCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sandboxLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Variante B · marge serrée
          </Text>
          <CloudLayerViz viz={MOCK_SCORE_MEDIUM.cloud_layer_viz!} variant="ridge" showVariantLabel />
        </View>

        <View style={[styles.sandboxCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sandboxLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Variante C · nuage couvrant
          </Text>
          <CloudLayerViz
            viz={{
              ...MOCK_SCORE_HIGH.cloud_layer_viz!,
              cloud_base: 2600,
            }}
            variant="minimal"
            showVariantLabel
          />
        </View>

        <View style={[styles.sandboxCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sandboxLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            Variante D · ciel dégagé (WIP)
          </Text>
          <CloudLayerViz
            viz={{ summit_altitude: 476, cloud_base: 5000, pressure_levels: [] }}
            isSunny
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 40, gap: 24 },
  button: { borderWidth: 1, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  sandbox: { gap: 16 },
  sandboxTitle: { fontSize: 20 },
  sandboxCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sandboxLabel: {
    fontSize: 13,
  },
});
