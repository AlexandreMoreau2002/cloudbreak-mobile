import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/utils/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePaywall } from '@/contexts/PaywallContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function getInitials(email: string): string {
  const parts = email.split('@')[0].split(/[._-]/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function MountainDecoration({ color }: { color: string }) {
  return (
    <View style={styles.mountainWrap} pointerEvents="none">
      {/* Pic arrière-plan (plus grand, décalé à gauche) */}
      <View style={[styles.mountainBack, { borderBottomColor: color }]} />
      {/* Pic avant (plus petit, à droite) */}
      <View style={[styles.mountainFront, { borderBottomColor: color }]} />
    </View>
  );
}

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  typography: ReturnType<typeof useTheme>['typography'];
  isLast?: boolean;
};

function SettingsRow({ icon, label, value, onPress, colors, typography, isLast }: RowProps) {
  return (
    <TouchableOpacity
      style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={18} color={colors.textSecondary} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, { color: colors.textPrimary, fontFamily: typography.fontFamily.regular }]}>
        {label}
      </Text>
      <Text style={[styles.rowValue, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {value}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { locale, toggleLocale } = useLanguage();
  const { colors, typography, scheme, toggleScheme } = useTheme();
  const { showPaywall } = usePaywall();

  const bannerBg = scheme === 'light' ? colors.surface : '#2A2A2A';
  const bannerBorder = scheme === 'light' ? colors.accent : '#3A3A3A';
  const bannerLabelColor = colors.accent;
  const bannerTitleColor = colors.textPrimary;
  const bannerSubtitleColor = colors.textSecondary;
  const mountainColor = scheme === 'light' ? 'rgba(178,140,110,0.15)' : 'rgba(178,140,110,0.12)';

  const email = session?.user?.email ?? '';
  const initials = getInitials(email);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <Text style={[styles.sectionHeader, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        PROFIL
      </Text>
      <Text style={[styles.pageTitle, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>
        {i18n.t('profile.title')}
      </Text>

      {/* User card */}
      <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={[styles.avatarText, { fontFamily: typography.fontFamily.semiBold }]}>
            {initials}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold }]}>
            {email.split('@')[0]}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {email}
          </Text>
        </View>
      </View>

      {/* Pro banner */}
      <TouchableOpacity
        style={[styles.proBanner, { backgroundColor: bannerBg, borderColor: bannerBorder }]}
        onPress={showPaywall}
        activeOpacity={0.85}
      >
        <View style={styles.proBannerContent}>
          <Text style={[styles.proBannerLabel, { fontFamily: typography.fontFamily.semiBold, color: bannerLabelColor }]}>
            {i18n.t('profile.proBannerLabel')}
          </Text>
          <Text style={[styles.proBannerTitle, { fontFamily: typography.fontFamily.bold, color: bannerTitleColor }]}>
            {i18n.t('profile.proBannerTitle')}
          </Text>
          <Text style={[styles.proBannerSubtitle, { fontFamily: typography.fontFamily.regular, color: bannerSubtitleColor }]}>
            {i18n.t('profile.proBannerSubtitle')}
          </Text>
        </View>
        <MountainDecoration color={mountainColor} />
        <Ionicons name="arrow-forward" size={18} color={colors.accent} style={styles.bannerArrow} />
      </TouchableOpacity>

      {/* Préférences */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {i18n.t('profile.sectionPreferences')}
      </Text>
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SettingsRow
          icon="sunny-outline"
          label={i18n.t('profile.appearance')}
          value={scheme === 'light' ? i18n.t('profile.appearanceLight') : i18n.t('profile.appearanceDark')}
          onPress={toggleScheme}
          colors={colors}
          typography={typography}
        />
        <SettingsRow
          icon="language-outline"
          label={i18n.t('profile.language')}
          value={locale === 'fr' ? i18n.t('profile.languageFrLabel') : i18n.t('profile.languageEnLabel')}
          onPress={toggleLocale}
          colors={colors}
          typography={typography}
          isLast
        />
      </View>

      {/* Compte */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {i18n.t('profile.sectionAccount')}
      </Text>
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.row} onPress={signOut} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color="#C25C4A" style={styles.rowIcon} />
          <Text style={[styles.rowLabel, { color: '#C25C4A', fontFamily: typography.fontFamily.regular }]}>
            {i18n.t('profile.signOut')}
          </Text>
        </TouchableOpacity>
      </View>

      {__DEV__ && (
        <TouchableOpacity
          style={[styles.devButton, { borderColor: colors.border }]}
          onPress={() => router.push('/sandbox' as import('expo-router').Href)}
          activeOpacity={0.7}
        >
          <Text style={[styles.devButtonText, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            DEV · CloudLayerViz Sandbox
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 48, gap: 12 },

  sectionHeader: { fontSize: 11, letterSpacing: 1.5 },
  pageTitle: { fontSize: 32, marginBottom: 4 },

  userCard: {
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
  avatarText: { color: '#fff', fontSize: 16 },
  userInfo: { flex: 1 },
  userName: { fontSize: 15 },
  userEmail: { fontSize: 12, marginTop: 1 },

  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    overflow: 'hidden',
  },
  proBannerContent: { flex: 1, gap: 2 },
  proBannerLabel: { fontSize: 10, letterSpacing: 1.5 },
  proBannerTitle: { fontSize: 18 },
  proBannerSubtitle: { fontSize: 12 },

  mountainWrap: {
    position: 'absolute',
    right: 44,
    bottom: 0,
    width: 90,
    height: 70,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  mountainBack: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 38,
    borderRightWidth: 38,
    borderBottomWidth: 68,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  mountainFront: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 28,
    borderRightWidth: 28,
    borderBottomWidth: 50,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },

  bannerArrow: { marginLeft: 4 },

  sectionLabel: { fontSize: 11, letterSpacing: 1.5, marginTop: 8 },

  group: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: { width: 20, textAlign: 'center' },
  rowLabel: { flex: 1, fontSize: 15 },
  rowValue: { fontSize: 15 },

  devButton: { borderWidth: 1, borderRadius: 12, borderStyle: 'dashed', padding: 12, alignItems: 'center', marginTop: 8 },
  devButtonText: { fontSize: 12 },
});
