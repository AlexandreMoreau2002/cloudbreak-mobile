import i18n from '@/utils/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const { colors, typography, scheme, toggleScheme } = useTheme();
  const { signOut } = useAuth();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32 },
  button: { borderWidth: 1, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
});
