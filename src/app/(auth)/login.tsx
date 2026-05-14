import i18n from '@/utils/i18n';
import { useAuthForm } from '@/hooks/useAuthForm';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { MountainBackground } from '@/components/mountain-background';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  useLanguage();
  const { colors, typography, spacing, radius } = useTheme();
  const { email, setEmail, password, setPassword, loading, mode, toggleMode, handleSubmit } = useAuthForm();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MountainBackground opacity={0.25} />

      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.accent, fontFamily: typography.fontFamily.light }]}>
          {i18n.t('auth.eyebrow')}
        </Text>
        {/* Brand name — intentionally not translated */}
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          Cloudbreak
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: typography.fontFamily.light }]}>
          {i18n.t('auth.subtitle')}
        </Text>
      </View>

      <View style={[styles.form, { gap: spacing.sm }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, fontFamily: typography.fontFamily.regular }]}
          placeholder={i18n.t('auth.email')}
          placeholderTextColor={colors.textDisabled}
          accessibilityLabel={i18n.t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, fontFamily: typography.fontFamily.regular }]}
          placeholder={i18n.t('auth.password')}
          placeholderTextColor={colors.textDisabled}
          accessibilityLabel={i18n.t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent, borderRadius: radius.sm, marginTop: spacing.sm }]}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.surface, fontFamily: typography.fontFamily.bold }]}>
            {loading ? i18n.t('auth.loading') : i18n.t(mode === 'login' ? 'auth.login' : 'auth.signup')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toggle} onPress={toggleMode}>
          <Text style={[styles.toggleText, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {mode === 'login' ? i18n.t('auth.noAccount') : i18n.t('auth.hasAccount')}{' '}
            <Text style={[styles.toggleLink, { color: colors.accent, fontFamily: typography.fontFamily.semiBold }]}>
              {i18n.t(mode === 'login' ? 'auth.signup' : 'auth.login')}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  header: { alignItems: 'center', marginBottom: 48 },
  eyebrow: { fontSize: 11, letterSpacing: 4, marginBottom: 12 },
  title: { fontSize: 42, letterSpacing: 1, marginBottom: 12 },
  subtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  form: {},
  input: { borderWidth: 1, borderRadius: 8, fontSize: 15, padding: 16, marginBottom: 4 },
  button: { padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 14, letterSpacing: 1 },
  toggle: { marginTop: 20, alignItems: 'center' },
  toggleText: { fontSize: 13 },
  toggleLink: {},
});
