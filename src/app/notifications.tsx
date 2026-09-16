import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import i18n from '@/utils/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { SettingsRow } from '@/components/profile';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

type NotificationPreferenceKey = 'notif_favorites' | 'notif_regional' | 'notif_terrain';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const { locationPermission } = useAuth();
  const { state, toggle } = useNotificationPreferences();

  const gpsLocked = locationPermission !== 'granted';
  const data = state.status === 'success' ? state.data : null;

  function valueFor(key: NotificationPreferenceKey) {
    if (key === 'notif_terrain' && gpsLocked) return i18n.t('notifications.unavailable');
    if (!data) return undefined;
    return data[key] ? i18n.t('notifications.on') : i18n.t('notifications.off');
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          testID="notifications-back"
          accessibilityRole="button"
          accessibilityLabel={i18n.t('common.back')}
          onPress={() => router.back()}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.eyebrow, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {i18n.t('profile.eyebrow')}
          </Text>
          <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>
            {i18n.t('notifications.title')}
          </Text>
        </View>
      </View>

      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SettingsRow
          icon="heart-outline"
          label={i18n.t('notifications.favorites')}
          value={valueFor('notif_favorites')}
          onPress={() => void toggle('notif_favorites')}
        />
        <SettingsRow
          icon="trail-sign-outline"
          label={i18n.t('notifications.regional')}
          value={valueFor('notif_regional')}
          onPress={() => void toggle('notif_regional')}
        />
        <SettingsRow
          icon="location-outline"
          label={i18n.t('notifications.terrain')}
          value={valueFor('notif_terrain')}
          onPress={() => void toggle('notif_terrain')}
          disabled={gpsLocked}
          isLast
        />
      </View>

      {gpsLocked ? (
        <Text style={[styles.hint, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {i18n.t('notifications.gpsLockedHint')}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 48, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 11, letterSpacing: 1.5, lineHeight: Math.round(11 * 1.5) },
  title: { fontSize: 22, lineHeight: Math.round(22 * 1.2) },
  group: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  hint: { fontSize: 12, lineHeight: Math.round(12 * 1.4), paddingHorizontal: 4, marginTop: -4 },
});
