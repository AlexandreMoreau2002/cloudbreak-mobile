import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import i18n from '@/utils/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { CodeInput } from '@/components/account';
import { useTheme } from '@/contexts/ThemeContext';
import { useAccountGate } from '@/contexts/AccountGateContext';

export default function VerifyScreen() {
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const auth = useAuth();
  const gate = useAccountGate();
  const router = useRouter();
  const { email = '', password = '' } = gate.emailUpgradeCredentials ?? {};
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resend, setResend] = useState(0);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (!resend) return;
    const id = setInterval(() => setResend((n) => n - 1), 1000);
    return () => clearInterval(id);
  }, [resend]);

  async function confirm() {
    if (code.length !== 6 || !email || !password || loading) return;
    setLoading(true);
    setError(false);
    const err = await auth.completeEmailUpgrade(email, password, code);
    setLoading(false);
    if (err) {
      setError(true);
      return;
    }
    router.push('/survey');
  }

  async function resendCode() {
    if (resend || loading) return;
    setResendError(null);
    const err = await auth.resendEmailUpgrade(String(email));
    if (err) {
      setResendError(i18n.t('verify.resendError'));
      return;
    }
    setCode('');
    setError(false);
    setResend(30);
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 42 },
      ]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={i18n.t('common.back')}
        testID="verify-back"
        onPress={() => router.back()}
        style={styles.back}
      >
        <Text style={{ color: colors.textPrimary, fontSize: 28 }}>‹</Text>
      </TouchableOpacity>

      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          {i18n.t('verify.title')}
        </Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
          {i18n.t('verify.subtitle')}{' '}
          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{email}</Text>
        </Text>
        <CodeInput value={code} onChange={setCode} error={error} />
        {error ? (
          <Text accessibilityRole="alert" style={{ color: '#C25C4A', textAlign: 'center' }}>
            {i18n.t('verify.error')}
          </Text>
        ) : null}
        {resendError ? (
          <Text accessibilityRole="alert" style={{ color: '#C25C4A', textAlign: 'center' }}>
            {resendError}
          </Text>
        ) : null}
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          accessibilityRole="button"
          testID="verify-submit"
          disabled={code.length !== 6 || loading}
          onPress={() => void confirm()}
          style={[
            styles.submit,
            { backgroundColor: colors.accent, opacity: code.length === 6 && !loading ? 1 : 0.4 },
          ]}
        >
          <Text style={{ color: '#fff' }}>
            {loading ? i18n.t('common.loading') : i18n.t('verify.confirm')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => void resendCode()}
          disabled={resend > 0 || loading}
          style={styles.resend}
        >
          <Text style={{ color: colors.accent, textAlign: 'center' }}>
            {resend ? i18n.t('verify.resendWait', { count: resend }) : i18n.t('verify.resend')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.modifyButton}>
          <Text style={[styles.modify, { color: colors.textSecondary }]}>{i18n.t('verify.modify')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 26 },
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -6 },
  center: { flex: 1, justifyContent: 'center', gap: 18 },
  title: { fontSize: 30, textAlign: 'center' },
  bottom: { gap: 12 },
  submit: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  resend: { minHeight: 44, justifyContent: 'center' },
  modifyButton: { minHeight: 44, justifyContent: 'center' },
  modify: { textAlign: 'center', textDecorationLine: 'underline' },
});
