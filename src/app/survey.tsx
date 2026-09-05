import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { SurveyForm } from '@/components/account';
import i18n from '@/utils/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useAccountGate } from '@/contexts/AccountGateContext';

export default function SurveyScreen() { const { colors } = useTheme(); const auth = useAuth(); const gate = useAccountGate(); const router = useRouter(); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null); async function finish(answer: Parameters<typeof auth.saveSurvey>[0]) { if (loading) return; setLoading(true); setError(null); const err = await auth.saveSurvey(answer); if (err) { setLoading(false); setError(i18n.t('survey.error')); return; } if (gate.pendingAction) await gate.finishAccountCreation(); else router.replace('/(tabs)'); setLoading(false); } return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}><TouchableOpacity accessibilityRole="button" testID="survey-skip" disabled={loading} onPress={() => void finish({ skipped: true })}><Text style={[styles.skip, { color: colors.textSecondary }]}>{i18n.t('survey.skip')}</Text></TouchableOpacity><View style={styles.content}><View style={styles.badge}><Text style={{ color: '#fff' }}>✓</Text><Text style={{ color: '#5C9E6E' }}>{i18n.t('survey.created')}</Text></View>{error ? <Text accessibilityRole="alert" style={[styles.error, { color: '#C25C4A' }]}>{error}</Text> : null}{loading ? <LoadingSpinner size="small" style={styles.spinner} /> : <SurveyForm onSubmit={finish} />}</View></SafeAreaView>; }
const styles = StyleSheet.create({ container: { flex: 1, paddingHorizontal: 26, paddingBottom: 42 }, skip: { textAlign: 'right', padding: 10, fontWeight: '600' }, content: { flex: 1, justifyContent: 'center' }, badge: { alignSelf: 'flex-start', flexDirection: 'row', gap: 6, padding: 8, borderRadius: 999, backgroundColor: '#E5F2E8', marginBottom: 14 }, error: { textAlign: 'center', marginBottom: 12 }, spinner: { flex: 0, minHeight: 50 } });
