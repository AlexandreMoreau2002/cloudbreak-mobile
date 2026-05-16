import i18n from '@/utils/i18n';
import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
  visible: boolean;
  userEmail: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteAccountModal({ visible, userEmail, onCancel, onConfirm }: Props) {
  const { colors } = useTheme();
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailMatch = emailInput.trim() === userEmail;

  const handleConfirm = async () => {
    if (!emailMatch) {
      setError(i18n.t('profile.deleteAccountModal.errorMismatch'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch {
      setError(i18n.t('profile.deleteAccountModal.errorGeneric'));
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEmailInput('');
    setError(null);
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {i18n.t('profile.deleteAccountModal.title')}
          </Text>
          <Text style={[styles.warning, { color: colors.textSecondary }]}>
            {i18n.t('profile.deleteAccountModal.warning')}
          </Text>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {i18n.t('profile.deleteAccountModal.emailLabel')}
          </Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder={i18n.t('profile.deleteAccountModal.emailPlaceholder')}
            placeholderTextColor={colors.textDisabled}
            value={emailInput}
            onChangeText={setEmailInput}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={[styles.confirmBtn, !emailMatch && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.confirmText}>{i18n.t('profile.deleteAccountModal.confirm')}</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={loading}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              {i18n.t('profile.deleteAccountModal.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { width: '100%', borderRadius: 16, borderWidth: 1, padding: 24, gap: 16 },
  title: { fontSize: 18, fontWeight: '600', fontFamily: 'JosefinSans_600SemiBold' },
  warning: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: -8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14 },
  error: { color: '#C25C4A', fontSize: 13 },
  confirmBtn: { backgroundColor: '#C25C4A', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'JosefinSans_600SemiBold' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 14 },
});
