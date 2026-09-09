import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import i18n from '@/utils/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAccountGate } from '@/contexts/AccountGateContext';
import { AuthBackdrop } from '@/components/account/AuthBackdrop';
import { AccountForm, type AccountMode } from '@/components/account';

const DUPLICATE_ACCOUNT_MESSAGES = new Set(['user already registered']);

export default function AccountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ firstRun?: string; mode?: string }>();
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const { locale } = useLanguage();
  const auth = useAuth();
  const gate = useAccountGate();
  const [mode, setMode] = useState<AccountMode>(params.mode === 'login' ? 'connexion' : 'creation');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    if (gate.pendingAction) await gate.finishAccountCreation();
    else router.replace('/(tabs)');
  }

  function errorCopy(message: string) {
    const normalized = message.trim().toLowerCase();
    if (normalized === 'email_upgrade_unavailable') return i18n.t('account.emailUpgradeUnavailable');
    if (DUPLICATE_ACCOUNT_MESSAGES.has(normalized)) {
      return i18n.t('account.errorTaken');
    }
    if (normalized.includes('invalid') || normalized.includes('password') || normalized.includes('mot de passe')) {
      return i18n.t('account.errorWrongPassword');
    }
    return i18n.t('account.errorNetwork');
  }

  async function submit(email: string, password: string) {
    if (!email.trim() || !password) {
      setError(i18n.t('auth.emptyFields'));
      return;
    }
    setLoading(true);
    setError(null);
    const err = mode === 'creation'
      ? await auth.beginEmailUpgrade(email.trim(), locale)
      : await auth.signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(errorCopy(err.message));
      return;
    }
    if (mode === 'creation') {
      gate.setEmailUpgradeCredentials({ email: email.trim(), password });
      router.push('/verify');
    } else {
      await complete();
    }
  }

  async function apple() {
    if (Platform.OS !== 'ios') return;
    setLoading(true);
    setError(null);
    const err = await auth.signInWithApple(mode);
    setLoading(false);
    if (err) setError(errorCopy(err.message));
    else if (mode === 'creation') router.push('/survey');
    else await complete();
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
        testID="account-back"
        onPress={() => void gate.cancelAccountFlow()}
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
              {i18n.t('account.eyebrow')}
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>
              {i18n.t(mode === 'creation' ? 'account.createTitle' : 'account.loginTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {i18n.t(mode === 'creation' ? 'account.createSubtitle' : 'account.loginSubtitle')}
            </Text>
            <AccountForm
              mode={mode}
              loading={loading}
              error={error}
              onSubmit={submit}
              onApple={apple}
              onModeChange={() => setMode(mode === 'creation' ? 'connexion' : 'creation')}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {params.firstRun ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => void gate.cancelAccountFlow()}
          style={styles.exploreButton}
        >
          <Text style={[styles.explore, { color: colors.textSecondary }]}>{i18n.t('account.explore')}</Text>
        </TouchableOpacity>
      ) : null}
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
  exploreButton: { minHeight: 44, justifyContent: 'center', zIndex: 2 },
  explore: { textAlign: 'center', textDecorationLine: 'underline', padding: 10 },
});
