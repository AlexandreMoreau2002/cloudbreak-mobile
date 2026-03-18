import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function HomeScreen() {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold }}>
        Cloudbreak 🌊
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm, marginTop: spacing.sm }}>
        Hello Alex, le setup mobile fonctionne !
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
