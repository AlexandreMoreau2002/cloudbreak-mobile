import { useState } from 'react';
import { Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import i18n from '@/utils/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountGate } from '@/contexts/AccountGateContext';
import { AccountForm, type AccountMode } from '@/components/account';

export default function AccountScreen() {
  const router = useRouter(); const params = useLocalSearchParams<{ firstRun?: string; mode?: string }>(); const { colors, typography } = useTheme(); const auth = useAuth(); const gate = useAccountGate(); const [mode, setMode] = useState<AccountMode>(params.mode === 'login' ? 'connexion' : 'creation'); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  async function complete() { if (gate.pendingAction) await gate.finishAccountCreation(); else router.replace('/(tabs)'); }
  async function submit(email: string, password: string) { if (!email || !password) { setError(i18n.t('auth.emptyFields')); return; } setLoading(true); setError(null); const err = mode === 'creation' ? await auth.beginEmailUpgrade(email) : await auth.signIn(email, password); setLoading(false); if (err) { setError(err.message); return; } if (mode === 'creation') router.push({ pathname: '/verify', params: { email, password } }); else await complete(); }
  async function apple() { if (Platform.OS !== 'ios') return; setLoading(true); setError(null); const err = await auth.signInWithApple(); setLoading(false); if (err) setError(err.message); else router.push('/survey'); }
  return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}><TouchableOpacity testID="account-back" onPress={() => gate.cancelAccountFlow()} style={styles.back}><Text style={{ color: colors.textPrimary, fontSize: 28 }}>‹</Text></TouchableOpacity><View style={styles.center}><Text style={[styles.eyebrow, { color: colors.accent, fontFamily: typography.fontFamily.semiBold }]}>{i18n.t('account.eyebrow')}</Text><Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>{i18n.t(mode === 'creation' ? 'account.createTitle' : 'account.loginTitle')}</Text><Text style={[styles.subtitle, { color: colors.textSecondary }]}>{i18n.t(mode === 'creation' ? 'account.createSubtitle' : 'account.loginSubtitle')}</Text><AccountForm mode={mode} loading={loading} error={error} onSubmit={submit} onApple={apple} onModeChange={() => setMode(mode === 'creation' ? 'connexion' : 'creation')} /></View>{params.firstRun ? <TouchableOpacity onPress={() => gate.cancelAccountFlow()}><Text style={[styles.explore, { color: colors.textSecondary }]}>{i18n.t('account.explore')}</Text></TouchableOpacity> : null}</SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1, paddingHorizontal: 26, paddingBottom: 42 }, back: { width: 44, height: 44, justifyContent: 'center' }, center: { flex: 1, justifyContent: 'center', gap: 12 }, eyebrow: { fontSize: 11, letterSpacing: 3.4, textAlign: 'center' }, title: { fontSize: 34, textAlign: 'center' }, subtitle: { fontSize: 14.5, lineHeight: 22, textAlign: 'center', marginBottom: 14 }, explore: { textAlign: 'center', textDecorationLine: 'underline', padding: 10 } });
