import { StyleSheet, Text, View } from 'react-native';

import i18n from '@/utils/i18n';
import { useTheme } from '@/contexts/ThemeContext';

function getInitials(displayName: string | null): string {
  if (!displayName) return '—';
  const parts = displayName.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

type Props = { email: string; displayName: string | null };

export function UserCard({ email, displayName }: Props) {
  const { colors, typography } = useTheme();
  const initials = getInitials(displayName);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
        <Text style={[styles.avatarText, { fontFamily: typography.fontFamily.semiBold }]}>
          {initials}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold }]}>
          {displayName ?? i18n.t('profile.displayName.fallback')}
        </Text>
        <Text style={[styles.email, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {email}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, lineHeight: Math.round(16 * 1.2) },
  info: { flex: 1 },
  name: { fontSize: 15, lineHeight: Math.round(15 * 1.5) },
  email: { fontSize: 12, marginTop: 2, lineHeight: Math.round(12 * 1.5) },
});
