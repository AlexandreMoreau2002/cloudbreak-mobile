import { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import i18n from '@/utils/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { ErrorState } from '@/components/error-state';
import type { AsyncState } from '@/services/mockData/types';
import { LoadingSpinner } from '@/components/loading-spinner';

interface Props {
  displayName: string | null;
  state: AsyncState<string | null>;
  onSave: (value: string | null) => void;
  onCancel: () => void;
}

export function DisplayNameModal({ displayName, state, onSave, onCancel }: Props) {
  const { colors, typography } = useTheme();
  const [draft, setDraft] = useState(displayName ?? '');
  const normalized = draft.trim();
  const count = Array.from(normalized).length;
  const valid = count > 0 && count <= 25;
  const loading = state.status === 'loading';
  const cancel = () => { if (!loading) onCancel(); };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={cancel}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold }]}>
            {i18n.t('profile.displayName.title')}
          </Text>
          <Text style={{ color: colors.textPrimary }}>{i18n.t('profile.displayName.label')}</Text>
          <TextInput
            testID="display-name-input"
            accessibilityLabel={i18n.t('profile.displayName.label')}
            accessibilityHint={i18n.t('profile.displayName.hint')}
            style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
            value={draft}
            onChangeText={setDraft}
            editable={!loading}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            onSubmitEditing={() => { if (valid && !loading) onSave(normalized); }}
          />
          <Text style={{ color: colors.textSecondary }}>{i18n.t('profile.displayName.hint')}</Text>
          <Text testID="display-name-count" accessibilityLiveRegion="polite" style={{ color: colors.textSecondary }}>
            {i18n.t('profile.displayName.count', { count, max: 25 })}
          </Text>
          {count > 25 && <ErrorState title={i18n.t('profile.displayName.validation')} />}
          {state.status === 'error' && <ErrorState title={i18n.t('profile.displayName.error')} />}
          <TouchableOpacity
            testID="display-name-save"
            accessibilityRole="button"
            accessibilityLabel={i18n.t('profile.displayName.save')}
            accessibilityState={{ disabled: !valid || loading, busy: loading }}
            disabled={!valid || loading}
            style={[styles.button, { backgroundColor: colors.accent }, (!valid || loading) && styles.disabled]}
            onPress={() => { if (valid && !loading) onSave(normalized); }}
          >
            {loading ? <LoadingSpinner size="small" color={colors.surface} style={{ flex: 0 }} /> : (
              <Text style={{ color: colors.surface }}>{i18n.t('profile.displayName.save')}</Text>
            )}
          </TouchableOpacity>
          {displayName !== null && (
            <TouchableOpacity testID="display-name-erase" accessibilityRole="button" disabled={loading} accessibilityState={{ disabled: loading }} style={styles.button} onPress={() => { if (!loading) onSave(null); }}>
              <Text style={{ color: colors.textPrimary }}>{i18n.t('profile.displayName.erase')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity testID="display-name-cancel" accessibilityRole="button" disabled={loading} accessibilityState={{ disabled: loading }} style={styles.button} onPress={cancel}>
            <Text style={{ color: colors.textSecondary }}>{i18n.t('profile.displayName.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  container: { borderRadius: 16, borderWidth: 1, padding: 24, gap: 12 },
  title: { fontSize: 20 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  button: { minHeight: 44, padding: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
