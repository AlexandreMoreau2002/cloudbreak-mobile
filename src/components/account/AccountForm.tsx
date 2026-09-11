import { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import i18n from '@/utils/i18n';
import { LEGAL_URLS } from '@/constants/legalUrls';
import { useTheme } from '@/contexts/ThemeContext';
import { useLegalLinks } from '@/hooks/useLegalLinks';
import { LoadingSpinner } from '@/components/loading-spinner';
import { isPasswordLongEnough, PasswordField } from '@/components/account/PasswordField';

export type AccountMode = 'creation' | 'connexion';

interface Props {
  mode: AccountMode;
  loading: boolean;
  error?: string | null;
  onSubmit: (email: string, password: string) => void;
  onApple: () => void;
  onModeChange: () => void;
  onForgotPassword: () => void;
}

export function AccountForm({ mode, loading, error, onSubmit, onApple, onModeChange, onForgotPassword }: Props) {
  const { colors, typography, radius, spacing } = useTheme();
  const { openLegalLink } = useLegalLinks();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  const appleAvailable = Platform.OS === 'ios';
  const isCreationPasswordLongEnough = isPasswordLongEnough(password);
  const submitDisabled = loading || (mode === 'creation' && !isCreationPasswordLongEnough);

  function submit() {
    if (mode === 'creation' && !isCreationPasswordLongEnough) return;
    onSubmit(email, password);
  }

  return (
    <View style={{ gap: spacing.md }}>
      {appleAvailable ? (
        <>
          <TouchableOpacity
            accessibilityRole="button"
            testID="account-apple"
            onPress={onApple}
            disabled={loading}
            style={styles.apple}
          >
            <Text style={styles.appleText}>  {i18n.t('account.apple')}</Text>
          </TouchableOpacity>
          <View accessibilityRole="none" style={styles.or}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <Text style={{ color: colors.textSecondary }}>{i18n.t('account.or')}</Text>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
          </View>
        </>
      ) : null}

      <TextInput
        accessibilityLabel={i18n.t('auth.email')}
        testID="account-email"
        value={email}
        onChangeText={setEmail}
        onFocus={() => setFocused('email')}
        onBlur={() => setFocused(null)}
        placeholder={i18n.t('auth.email')}
        placeholderTextColor={colors.textDisabled}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        style={[
          styles.field,
          styles.input,
          {
            color: colors.textPrimary,
            backgroundColor: colors.surface,
            borderColor: focused === 'email' ? colors.accent : colors.border,
            fontFamily: typography.fontFamily.regular,
          },
        ]}
      />

      <PasswordField
        value={password}
        onChangeText={setPassword}
        autoComplete={mode === 'creation' ? 'new-password' : 'current-password'}
        showStrength={mode === 'creation'}
        focused={focused === 'password'}
        onFocus={() => setFocused('password')}
        onBlur={() => setFocused(null)}
      />

      {mode === 'connexion' ? (
        <TouchableOpacity accessibilityRole="button" testID="account-forgot" onPress={onForgotPassword}>
          <Text style={{ color: colors.accent, textAlign: 'right' }}>{i18n.t('account.forgot')}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
          {i18n.t('account.legalPrefix')}{' '}
          <Text testID="account-cgu" onPress={() => openLegalLink(LEGAL_URLS.cgu)} style={{ color: colors.accent }}>
            {i18n.t('account.cgu')}
          </Text>{' '}
          {i18n.t('account.legalAnd')}{' '}
          <Text
            testID="account-privacy"
            onPress={() => openLegalLink(LEGAL_URLS.privacy)}
            style={{ color: colors.accent }}
          >
            {i18n.t('account.privacy')}
          </Text>
          {'.'}
        </Text>
      )}

      {error ? (
        <View accessibilityRole="alert" style={[styles.error, { backgroundColor: '#F5DFDB' }]}>
          <Text style={{ color: '#C25C4A', textAlign: 'center' }}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        testID="account-submit"
        disabled={submitDisabled}
        onPress={submit}
        style={[styles.submit, { backgroundColor: colors.accent, borderRadius: radius.sm }]}
      >
        {loading ? (
          <LoadingSpinner size="small" color="#fff" style={{ flex: 0 }} />
        ) : (
          <Text style={styles.submitText}>
            {i18n.t(mode === 'creation' ? 'account.create' : 'account.login')}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity accessibilityRole="button" onPress={onModeChange} style={styles.modeToggle}>
        <Text style={{ textAlign: 'center', color: colors.textSecondary }}>
          {i18n.t(mode === 'creation' ? 'account.hasAccount' : 'account.noAccount')}{' '}
          <Text style={{ color: colors.accent, fontWeight: '600' }}>
            {i18n.t(mode === 'creation' ? 'account.login' : 'account.create')}
          </Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  apple: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#000',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  appleText: { color: '#fff', fontSize: 15 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center' },
  line: { flex: 1, height: 1 },
  field: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
  input: { fontSize: 15 },
  error: { minHeight: 42, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 12 },
  submit: { height: 50, justifyContent: 'center', alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modeToggle: { minHeight: 44, justifyContent: 'center' },
});
