import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import i18n from '@/utils/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { ErrorState } from '@/components/error-state';
import type { AsyncState } from '@/services/mockData/types';
import { LoadingSpinner } from '@/components/loading-spinner';

function getInitials(displayName: string | null, email: string): string {
  if (!displayName?.trim()) return Array.from(email)[0]?.toUpperCase() ?? '—';
  const parts = displayName.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => Array.from(p)[0]?.toUpperCase() ?? '')
    .join('');
}

type Props = {
  email: string;
  displayName: string | null;
  state: AsyncState<string | null>;
  onSave: (value: string | null) => Promise<boolean>;
  disabled?: boolean;
};

export function UserCard({ email, displayName, state, onSave, disabled = false }: Props) {
  const { colors, typography } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const editingRef = useRef(false);
  const requestPending = useRef(false);
  const generation = useRef(0);
  const normalized = draft.trim();
  const count = Array.from(normalized).length;
  const valid = count <= 24;
  const busy = saving || state.status === 'loading';
  const initials = getInitials(displayName, email);

  const cancel = useCallback(() => {
    editingRef.current = false;
    generation.current += 1;
    setEditing(false);
    setSaveFailed(false);
  }, []);

  // A navigation gesture discards the draft before its final blur can submit it.
  useFocusEffect(useCallback(() => cancel, [cancel]));

  function startEditing() {
    if (disabled || busy || requestPending.current) return;
    generation.current += 1;
    editingRef.current = true;
    setDraft(displayName ?? '');
    setSaveFailed(false);
    setEditing(true);
  }

  async function submit() {
    if (!editingRef.current || !valid || busy || requestPending.current) return;
    // This synchronous guard also handles blur arriving before the check press.
    requestPending.current = true;
    const requestGeneration = generation.current;
    setSaving(true);
    setSaveFailed(false);
    const saved = await onSave(normalized || null);
    requestPending.current = false;
    setSaving(false);
    if (requestGeneration !== generation.current) return;
    if (saved) {
      editingRef.current = false;
      setEditing(false);
    } else {
      setSaveFailed(true);
    }
  }

  return (
    <View>
      <Pressable
        accessible={!editing}
        accessibilityRole={editing ? undefined : 'button'}
        accessibilityLabel={editing ? undefined : i18n.t('profile.displayName.edit')}
        accessibilityState={{ disabled: disabled || busy }}
        accessibilityActions={editing ? [{ name: 'escape', label: i18n.t('profile.displayName.cancel') }] : undefined}
        onAccessibilityEscape={cancel}
        onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === 'escape') cancel(); }}
        onPress={editing ? undefined : startEditing}
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: editing ? colors.accent : colors.border },
          editing && { borderWidth: 1.5, boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 4, color: `${colors.accent}40` }] },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={[styles.avatarText, { fontFamily: typography.fontFamily.semiBold }]}>
            {initials}
          </Text>
        </View>
        <View style={styles.info}>
          {editing ? (
            <View style={[styles.field, { borderBottomColor: colors.accent }]}>
              <TextInput
                testID="display-name-input"
                accessibilityLabel={i18n.t('profile.displayName.label')}
                accessibilityHint={i18n.t('profile.displayName.hint')}
                style={[styles.input, { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold }]}
                value={draft}
                onChangeText={(value) => { setDraft(value); setSaveFailed(false); }}
                editable={!busy}
                autoFocus
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                submitBehavior="submit"
                onSubmitEditing={() => void submit()}
                onBlur={() => void submit()}
                onKeyPress={(event) => { if (event.nativeEvent.key === 'Escape') cancel(); }}
                onAccessibilityEscape={cancel}
              />
              <Text testID="display-name-count" accessibilityLiveRegion="polite" style={[styles.count, { color: colors.textDisabled, fontFamily: typography.fontFamily.regular }]}>
                {i18n.t('profile.displayName.count', { count, max: 24 })}
              </Text>
            </View>
          ) : (
            <Text style={[
              styles.name,
              { color: colors.textPrimary, fontFamily: typography.fontFamily.semiBold },
              !displayName?.trim() && { color: colors.textDisabled, fontFamily: typography.fontFamily.regular },
            ]}>
              {displayName?.trim() ? displayName : i18n.t('profile.displayName.add')}
            </Text>
          )}
          <Text style={[styles.email, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
            {email}
          </Text>
        </View>
        {editing && (
          <Pressable
            testID="display-name-save"
            accessibilityRole="button"
            accessibilityLabel={i18n.t('profile.displayName.save')}
            accessibilityState={{ disabled: !valid || busy, busy }}
            disabled={!valid || busy}
            hitSlop={5}
            onPress={() => void submit()}
            style={[styles.check, { backgroundColor: colors.textPrimary }, (!valid || busy) && styles.disabled]}
          >
            {busy ? <LoadingSpinner size="small" color={colors.surface} style={{ flex: 0 }} /> : (
              <Text style={[styles.checkText, { color: colors.surface }]}>✓</Text>
            )}
          </Pressable>
      )}
    </Pressable>
      {editing && (
        <Text style={[styles.hint, { color: colors.textDisabled, fontFamily: typography.fontFamily.regular }]}>
          {i18n.t('profile.displayName.hint')}
        </Text>
      )}
      {editing && !valid && <ErrorState title={i18n.t('profile.displayName.validation')} />}
      {editing && (saveFailed || state.status === 'error') && <ErrorState title={i18n.t('profile.displayName.error')} />}
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
  field: { flexDirection: 'row', alignItems: 'center', height: 34, borderBottomWidth: 1.5, marginBottom: 8 },
  input: { flex: 1, minWidth: 0, height: 34, padding: 0, fontSize: 15 },
  count: { fontSize: 11, marginLeft: 4 },
  check: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  checkText: { fontSize: 18 },
  disabled: { opacity: 0.4 },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 8, marginLeft: 16 },
  name: { fontSize: 15, lineHeight: Math.round(15 * 1.5) },
  email: { fontSize: 12, lineHeight: Math.round(12 * 1.5) },
});
