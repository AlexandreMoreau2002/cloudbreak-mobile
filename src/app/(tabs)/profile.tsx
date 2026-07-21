import i18n from '@/utils/i18n';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { track } from '@/services/analytics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LEGAL_URLS } from '@/constants/legalUrls';
import { useLegalLinks } from '@/hooks/useLegalLinks';
import { usePaywall } from '@/contexts/PaywallContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useSelectedPeak } from '@/contexts/SelectedPeakContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DeleteAccountModal, ProBanner, SettingsRow, UserCard } from '@/components/profile';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showPaywall } = usePaywall();
  const { session, signOut, deleteAccount } = useAuth();
  const { setSelectedPeak } = useSelectedPeak();
  const { resetOnboarding } = useOnboarding();
  const { locale, toggleLocale } = useLanguage();
  const { openLegalLink } = useLegalLinks();
  const { colors, typography, scheme, toggleScheme } = useTheme();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleSignOut() {
    track('signed_out');
    signOut();
  }

  function handleToggleTheme() {
    const nextScheme = scheme === 'light' ? 'dark' : 'light';
    track('theme_toggled', { scheme: nextScheme });
    toggleScheme();
  }

  function handleToggleLanguage() {
    const nextLocale = locale === 'fr' ? 'en' : 'fr';
    track('language_toggled', { locale: nextLocale });
    toggleLocale();
  }

  function handleOpenDeleteModal() {
    track('delete_account_initiated');
    setDeleteModalVisible(true);
  }

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteAccount();
    } catch {
      setDeleteError(i18n.t('profile.deleteAccountModal.errorGeneric'));
      setDeleteLoading(false);
    }
  };

  const email = session?.user?.email ?? '';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <Text style={[styles.eyebrow, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {i18n.t('profile.eyebrow')}
      </Text>
      <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>
        {i18n.t('profile.title')}
      </Text>

      <UserCard email={email} />

      <ProBanner
        label={i18n.t('profile.proBannerLabel')}
        title={i18n.t('profile.proBannerTitle')}
        subtitle={i18n.t('profile.proBannerSubtitle')}
        onPress={() => showPaywall('profile_banner')}
      />

      <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {i18n.t('profile.sectionPreferences')}
      </Text>
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SettingsRow
          icon="sunny-outline"
          label={i18n.t('profile.appearance')}
          value={scheme === 'light' ? i18n.t('profile.appearanceLight') : i18n.t('profile.appearanceDark')}
          onPress={handleToggleTheme}
        />
        <SettingsRow
          icon="language-outline"
          label={i18n.t('profile.language')}
          value={locale === 'fr' ? i18n.t('profile.languageFrLabel') : i18n.t('profile.languageEnLabel')}
          onPress={handleToggleLanguage}
          isLast
        />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {i18n.t('legal.sectionTitle')}
      </Text>
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SettingsRow
          icon="shield-checkmark-outline"
          label={i18n.t('legal.privacy')}
          onPress={() => openLegalLink(LEGAL_URLS.privacy)}
        />
        <SettingsRow
          icon="document-text-outline"
          label={i18n.t('legal.cgu')}
          onPress={() => openLegalLink(LEGAL_URLS.cgu)}
        />
        <SettingsRow
          icon="mail-outline"
          label={i18n.t('legal.support')}
          onPress={() => openLegalLink(LEGAL_URLS.support)}
          isLast
        />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
        {i18n.t('profile.sectionAccount')}
      </Text>
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color="#C25C4A" style={styles.signOutIcon} />
          <Text style={[styles.signOutLabel, { fontFamily: typography.fontFamily.regular }]}>
            {i18n.t('profile.signOut')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.signOutRow} onPress={handleOpenDeleteModal} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={18} color="#C25C4A" style={styles.signOutIcon} />
          <Text style={[styles.signOutLabel, { fontFamily: typography.fontFamily.regular }]}>
            {i18n.t('profile.deleteAccount')}
          </Text>
        </TouchableOpacity>
      </View>

      <DeleteAccountModal
        visible={deleteModalVisible}
        userEmail={email}
        onCancel={() => { setDeleteModalVisible(false); setDeleteError(null); }}
        onConfirm={handleDeleteConfirm}
        error={deleteError}
        loading={deleteLoading}
      />

      {__DEV__ && (
        <>
          <TouchableOpacity
            style={[styles.devButton, { borderColor: colors.border }]}
            onPress={() => router.push('/sandbox' as import('expo-router').Href)}
            activeOpacity={0.7}
          >
            <Text style={[styles.devText, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
              DEV · CloudLayerViz Sandbox
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.devButton, { borderColor: '#C25C4A' }]}
            onPress={() => setSelectedPeak(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.devText, { color: '#C25C4A', fontFamily: typography.fontFamily.regular }]}>
              DEV · Reset sommet sélectionné
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.devButton, { borderColor: '#C25C4A' }]}
            onPress={() => void resetOnboarding()}
            activeOpacity={0.7}
            testID="dev-reset-onboarding"
          >
            <Text style={[styles.devText, { color: '#C25C4A', fontFamily: typography.fontFamily.regular }]}>
              DEV · Rejouer l&apos;onboarding
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 48, gap: 12 },

  eyebrow: { fontSize: 11, letterSpacing: 1.5, lineHeight: Math.round(11 * 1.5) },
  title: { fontSize: 32, marginBottom: 4, lineHeight: Math.round(32 * 1.2) },

  sectionLabel: { fontSize: 11, letterSpacing: 1.5, lineHeight: Math.round(11 * 1.5), marginTop: 8 },

  group: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },

  signOutRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  signOutIcon: { width: 20, textAlign: 'center' },
  signOutLabel: { flex: 1, fontSize: 15, lineHeight: Math.round(15 * 1.5), color: '#C25C4A' },

  devButton: { borderWidth: 1, borderRadius: 12, borderStyle: 'dashed', padding: 12, alignItems: 'center', marginTop: 8 },
  devText: { fontSize: 12, lineHeight: Math.round(12 * 1.5) },
});
