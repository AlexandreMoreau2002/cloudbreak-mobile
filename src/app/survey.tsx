import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import i18n from '@/utils/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountGate } from '@/contexts/AccountGateContext';
import { SurveyForm } from '@/components/account';

export default function SurveyScreen() { const { colors } = useTheme(); const auth = useAuth(); const gate = useAccountGate(); const router = useRouter(); async function finish(answer: Parameters<typeof auth.saveSurvey>[0]) { await auth.saveSurvey(answer); if (gate.pendingAction) await gate.finishAccountCreation(); else router.replace('/(tabs)'); } return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}><TouchableOpacity testID="survey-skip" onPress={() => finish({ skipped: true })}><Text style={[styles.skip, { color: colors.textSecondary }]}>{i18n.t('survey.skip')}</Text></TouchableOpacity><View style={styles.content}><View style={styles.badge}><Text>✓</Text><Text style={{ color: '#5C9E6E' }}>{i18n.t('survey.created')}</Text></View><SurveyForm onSubmit={finish} /></View></SafeAreaView>; }
const styles = StyleSheet.create({ container: { flex: 1, paddingHorizontal: 26, paddingBottom: 42 }, skip: { textAlign: 'right', padding: 10, fontWeight: '600' }, content: { flex: 1, justifyContent: 'center' }, badge: { alignSelf: 'flex-start', flexDirection: 'row', gap: 6, padding: 8, borderRadius: 999, backgroundColor: '#E5F2E8', marginBottom: 14 } });
