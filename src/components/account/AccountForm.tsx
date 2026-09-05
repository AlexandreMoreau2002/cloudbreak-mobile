import { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import i18n from '@/utils/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { LoadingSpinner } from '@/components/loading-spinner';
import { AuthBackdrop } from '@/components/account/AuthBackdrop';
import { useLegalLinks } from '@/hooks/useLegalLinks';
import { LEGAL_URLS } from '@/constants/legalUrls';

export type AccountMode = 'creation' | 'connexion';
interface Props { mode: AccountMode; loading: boolean; error?: string | null; onSubmit: (email: string, password: string) => void; onApple: () => void; onModeChange: () => void; }
export function AccountForm({ mode, loading, error, onSubmit, onApple, onModeChange }: Props) {
  const { colors, typography, radius, spacing } = useTheme(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [visible, setVisible] = useState(false);
  const { openLegalLink } = useLegalLinks();
  const strength = password ? Math.min(4, Number(password.length >= 8) + Number(password.length >= 12) + Number(/[a-z]/.test(password) && /[A-Z]/.test(password)) + Number(/\d/.test(password) && /[^A-Za-z0-9]/.test(password))) : 0;
  const apple = Platform.OS === 'ios';
  return <View style={{ gap: spacing.sm }}><AuthBackdrop />
    {apple ? <TouchableOpacity testID="account-apple" onPress={onApple} disabled={loading} style={styles.apple}><Text style={styles.appleText}>  {i18n.t('account.apple')}</Text></TouchableOpacity> : null}
    {apple ? <View style={styles.or}><View style={[styles.line, { backgroundColor: colors.border }]} /><Text style={{ color: colors.textSecondary }}>{i18n.t('account.or')}</Text><View style={[styles.line, { backgroundColor: colors.border }]} /></View> : null}
    <TextInput testID="account-email" value={email} onChangeText={setEmail} placeholder={i18n.t('auth.email')} placeholderTextColor={colors.textDisabled} keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border, fontFamily: typography.fontFamily.regular }]} />
    <View><View style={styles.password}><TextInput testID="account-password" value={password} onChangeText={setPassword} placeholder={i18n.t('auth.password')} placeholderTextColor={colors.textDisabled} secureTextEntry={!visible} autoComplete={mode === 'creation' ? 'new-password' : 'current-password'} style={[styles.passwordInput, { color: colors.textPrimary, fontFamily: typography.fontFamily.regular }]} /><TouchableOpacity onPress={() => setVisible(!visible)}><Text style={{ color: colors.textSecondary, fontSize: 10 }}>{visible ? i18n.t('account.hide') : i18n.t('account.show')}</Text></TouchableOpacity></View>{mode === 'creation' && strength > 0 ? <View style={styles.strength}>{[0,1,2,3].map((n) => <View key={n} style={[styles.segment, { backgroundColor: n < strength ? colors.accent : colors.border }]} />)}</View> : null}</View>
    {mode === 'connexion' ? <TouchableOpacity><Text style={{ color: colors.accent, textAlign: 'right' }}>{i18n.t('account.forgot')}</Text></TouchableOpacity> : <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{i18n.t('account.legalPrefix')} <Text testID="account-cgu" onPress={() => openLegalLink(LEGAL_URLS.cgu)} style={{ color: colors.accent }}>{i18n.t('account.cgu')}</Text> {i18n.t('account.legalAnd')} <Text testID="account-privacy" onPress={() => openLegalLink(LEGAL_URLS.privacy)} style={{ color: colors.accent }}>{i18n.t('account.privacy')}</Text>.</Text>}
    {error ? <Text accessibilityRole="alert" style={{ color: '#C25C4A', textAlign: 'center' }}>{error}</Text> : null}
    <TouchableOpacity testID="account-submit" disabled={loading} onPress={() => onSubmit(email, password)} style={[styles.submit, { backgroundColor: colors.accent, borderRadius: radius.sm }]}>{loading ? <LoadingSpinner size="small" style={{ flex: 0 }} /> : <Text style={styles.submitText}>{i18n.t(mode === 'creation' ? 'account.create' : 'account.login')}</Text>}</TouchableOpacity>
    <TouchableOpacity onPress={onModeChange}><Text style={{ textAlign: 'center', color: colors.textSecondary }}>{i18n.t(mode === 'creation' ? 'account.hasAccount' : 'account.noAccount')} <Text style={{ color: colors.accent }}>{i18n.t(mode === 'creation' ? 'account.login' : 'account.create')}</Text></Text></TouchableOpacity>
  </View>;
}
const styles = StyleSheet.create({ apple: { height: 50, borderRadius: 12, backgroundColor: '#000', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }, appleText: { color: '#fff', fontSize: 15 }, or: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center' }, line: { flex: 1, height: 1 }, input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 }, password: { height: 48, borderWidth: 1, borderColor: '#E9E4DA', borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }, passwordInput: { flex: 1, fontSize: 15 }, strength: { flexDirection: 'row', gap: 4, marginTop: 6 }, segment: { flex: 1, height: 3 }, submit: { height: 50, justifyContent: 'center', alignItems: 'center' }, submitText: { color: '#fff', fontSize: 15, fontWeight: '600' } });
