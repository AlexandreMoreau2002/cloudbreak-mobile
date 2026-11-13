import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import i18n from '@/utils/i18n';

type Props = {
  onCreateAccount: () => void;
  onLogin: () => void;
};

/** Account entry point shown for an anonymous Supabase session. */
export function GuestAccountCard({ onCreateAccount, onLogin }: Props) {
  const { colors, typography } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.accentSecondary ?? colors.accent }]}>
          <Ionicons name="person-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold }]}>
            {i18n.t('profile.guest.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {i18n.t('profile.guest.subtitle')}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        testID="guest-create-account"
        style={[styles.createButton, { backgroundColor: colors.accent }]}
        onPress={onCreateAccount}
        activeOpacity={0.8}
      >
        <Text style={[styles.createLabel, { fontFamily: typography.fontFamily.semiBold }]}>
          {i18n.t('profile.guest.createAccount')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" testID="guest-login" onPress={onLogin} activeOpacity={0.7} style={styles.loginButton}>
        <Text style={[styles.loginLabel, { color: colors.accent, fontFamily: typography.fontFamily.semiBold }]}>
          {i18n.t('profile.guest.login')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, lineHeight: Math.round(15 * 1.5) },
  subtitle: { fontSize: 12.5, lineHeight: Math.round(12.5 * 1.5) },
  createButton: { minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  createLabel: { color: '#FFFFFF', fontSize: 15, lineHeight: Math.round(15 * 1.5) },
  loginButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  loginLabel: { fontSize: 13, lineHeight: Math.round(13 * 1.5) },
});
