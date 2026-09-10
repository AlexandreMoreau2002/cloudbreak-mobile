import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import i18n from '@/utils/i18n';
import { DEBUG } from '@/constants/devConfig';
import { isRateLimitError, useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useAccountGate } from '@/contexts/AccountGateContext';
import { AuthBackdrop, CodeInput, isPasswordEligible, PasswordField } from '@/components/account';

const CODE_LENGTH = 6;
const RESEND_DELAY_SECONDS = 30;
export default function ResetConfirmScreen() {
  const router = useRouter();
  const { email = '', sent } = useLocalSearchParams<{ email?: string; sent?: string }>();
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const { locale } = useLanguage();
  const auth = useAuth();
  const gate = useAccountGate();
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resend, setResend] = useState(sent === '1' ? RESEND_DELAY_SECONDS : 0);
  const [resending, setResending] = useState(false);
  const submitInFlight = useRef(false);
  const resendInFlight = useRef(false);
  const canSubmit = code.length === CODE_LENGTH && isPasswordEligible(newPassword) && !loading;

  useEffect(() => {
    if (!email) router.replace('/reset');
  }, [email, router]);

  useEffect(() => {
    if (!resend) return;
    const id = setInterval(() => setResend((seconds) => seconds - 1), 1000);
    return () => clearInterval(id);
  }, [resend]);

  async function submit() {
    if (!canSubmit || submitInFlight.current) return;
    submitInFlight.current = true;
    if (DEBUG) console.debug('[reset-confirm] submit', { codeLength: code.length });

    setLoading(true);
    setCodeError(false);
    setError(null);
    const authError = await auth.completePasswordReset(email, code, newPassword);

    if (authError) {
      const message = authError.message.toLowerCase();
      if (message.includes('weak') || message.includes('password') || message.includes('at least')) {
        setError(i18n.t('reset.errorPassword'));
      } else if (
        message.includes('token') ||
        message.includes('otp') ||
        message.includes('expired') ||
        message.includes('invalid')
      ) {
        setCodeError(true);
        setError(i18n.t('reset.errorCode'));
      } else {
        setError(i18n.t('reset.errorNetwork'));
      }
      setLoading(false);
      submitInFlight.current = false;
      return;
    }

    if (gate.pendingAction) {
      const completion = await gate.finishAccountCreation();
      if (completion.replayFailed) router.replace('/(tabs)');
    } else {
      router.replace('/(tabs)');
    }
    setLoading(false);
    submitInFlight.current = false;
  }

  async function resendCode() {
    if (resend || loading || !email || resendInFlight.current) return;
    resendInFlight.current = true;
    setResending(true);
    setCodeError(false);
    setError(null);
    const authError = await auth.requestPasswordReset(email, locale);
    if (authError) setError(i18n.t(isRateLimitError(authError) ? 'reset.errorRateLimit' : 'reset.errorNetwork'));
    else setResend(RESEND_DELAY_SECONDS);
    setResending(false);
    resendInFlight.current = false;
  }

  return (
    <View
      testID="reset-confirm-screen"
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 42 },
      ]}
    >
      <AuthBackdrop />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={i18n.t('common.back')}
        testID="reset-confirm-back"
        onPress={() => router.back()}
        style={styles.back}
      >
        <Text style={{ color: colors.textPrimary, fontSize: 28 }}>‹</Text>
      </TouchableOpacity>

      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          {i18n.t('reset.confirmTitle')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {i18n.t('reset.confirmSubtitle')}{' '}
          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{email}</Text>
        </Text>
        {sent === '1' ? (
          <Text style={[styles.sent, { color: colors.textSecondary }]}>{i18n.t('reset.sent')}</Text>
        ) : null}

        <View testID="reset-confirm-credentials" style={styles.credentials}>
          <CodeInput value={code} onChange={setCode} error={codeError} />
          <PasswordField
            value={newPassword}
            onChangeText={setNewPassword}
            showStrength
            autoComplete="new-password"
            placeholder={i18n.t('reset.newPasswordPlaceholder')}
            testID="new-password"
          />
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          accessibilityRole="button"
          testID="reset-confirm-submit"
          disabled={!canSubmit}
          onPress={() => void submit()}
          style={[styles.submit, { backgroundColor: colors.accent, opacity: canSubmit ? 1 : 0.4 }]}
        >
          {loading ? (
            <LoadingSpinner size="small" color="#fff" style={styles.spinner} />
          ) : (
            <Text style={styles.submitText}>{i18n.t('reset.submit')}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          testID="reset-confirm-resend"
          disabled={resend > 0 || loading || resending}
          onPress={() => void resendCode()}
          style={styles.resend}
        >
          <Text style={{ color: colors.accent, textAlign: 'center' }}>
            {resend ? i18n.t('reset.resendWait', { count: resend }) : i18n.t('reset.resend')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 26 },
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -6, zIndex: 2 },
  center: { flex: 1, justifyContent: 'center', gap: 16, zIndex: 2 },
  credentials: { gap: 24 },
  title: { fontSize: 30, textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 22 },
  sent: { textAlign: 'center', lineHeight: 20 },
  error: { color: '#C25C4A', textAlign: 'center' },
  bottom: { gap: 12, zIndex: 2 },
  submit: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  spinner: { flex: 0 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  resend: { minHeight: 44, justifyContent: 'center' },
});
