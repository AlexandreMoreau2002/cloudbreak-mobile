import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import i18n from '@/utils/i18n';
import { DEBUG } from '@/constants/devConfig';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { AuthBackdrop } from '@/components/account';
import { useLanguage } from '@/contexts/LanguageContext';
import { LoadingSpinner } from '@/components/loading-spinner';

export default function ResetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const { locale } = useLanguage();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (DEBUG) console.debug('[reset] submit', { hasEmail: !!email });

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError(i18n.t('auth.emptyFields'));
      return;
    }
    if (!normalizedEmail.includes('@')) {
      setError(i18n.t('reset.errorEmail'));
      return;
    }

    setLoading(true);
    setError(null);
    const err = await auth.requestPasswordReset(normalizedEmail, locale);
    setLoading(false);
    if (err) {
      setError(i18n.t('reset.errorNetwork'));
      return;
    }

    setSent(true);
    router.push({ pathname: '/reset-confirm', params: { email: normalizedEmail } });
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 42 },
      ]}
    >
      <AuthBackdrop />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={i18n.t('common.back')}
        testID="reset-back"
        onPress={() => router.back()}
        style={styles.back}
      >
        <Text style={{ color: colors.textPrimary, fontSize: 28 }}>‹</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.center}>
            <Text style={[styles.eyebrow, { color: colors.accent, fontFamily: typography.fontFamily.semiBold }]}>
              {i18n.t('reset.eyebrow')}
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              {i18n.t('reset.requestTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {i18n.t('reset.requestSubtitle')}
            </Text>

            <TextInput
              accessibilityLabel={i18n.t('reset.emailPlaceholder')}
              testID="reset-email"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={i18n.t('reset.emailPlaceholder')}
              placeholderTextColor={colors.textDisabled}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={[
                styles.field,
                {
                  color: '#1a1a1a',
                  backgroundColor: '#fff',
                  borderColor: focused ? colors.accent : colors.border,
                  fontFamily: typography.fontFamily.regular,
                },
              ]}
            />

            {sent ? <Text style={[styles.sent, { color: colors.textSecondary }]}>{i18n.t('reset.sent')}</Text> : null}
            {error ? (
              <View accessibilityRole="alert" style={styles.error}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              accessibilityRole="button"
              testID="reset-submit"
              disabled={loading}
              onPress={() => void submit()}
              style={[styles.submit, { backgroundColor: colors.accent }]}
            >
              {loading ? (
                <LoadingSpinner size="small" color="#fff" style={styles.spinner} />
              ) : (
                <Text style={styles.submitText}>{i18n.t('reset.send')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 26 },
  flex: { flex: 1, zIndex: 2 },
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -6, zIndex: 2 },
  scroll: { flexGrow: 1, paddingBottom: 32, zIndex: 2 },
  center: { gap: 12, paddingVertical: 20, zIndex: 2 },
  eyebrow: { fontSize: 11, letterSpacing: 3.4, textAlign: 'center' },
  title: { fontSize: 34, lineHeight: 36, letterSpacing: -1, textAlign: 'center' },
  subtitle: {
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 14,
    maxWidth: 272,
    alignSelf: 'center',
  },
  field: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  sent: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  error: {
    minHeight: 42,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#F5DFDB',
  },
  errorText: { color: '#C25C4A', textAlign: 'center' },
  submit: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  spinner: { flex: 0 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
