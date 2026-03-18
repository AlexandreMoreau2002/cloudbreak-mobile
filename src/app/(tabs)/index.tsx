import i18n from '@/utils/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const { colors, typography } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold }}>
        {i18n.t('home.comingSoon')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
