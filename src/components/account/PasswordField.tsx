import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import i18n from '@/utils/i18n';
import { useTheme } from '@/contexts/ThemeContext';

export function passwordStrength(password: string): number {
  if (!password) return 0;
  return Math.min(
    4,
    Number(password.length >= 8) +
      Number(/[a-z]/.test(password) && /[A-Z]/.test(password)) +
      Number(/\d/.test(password)) +
      Number(/[^A-Za-z0-9]/.test(password)),
  );
}

export function isPasswordEligible(password: string): boolean {
  return passwordStrength(password) >= 4;
}

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  autoComplete?: 'new-password' | 'current-password';
  showStrength?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  focused?: boolean;
  testID?: string;
}

export function PasswordField({
  value,
  onChangeText,
  placeholder,
  autoComplete = 'current-password',
  showStrength = false,
  onFocus,
  onBlur,
  focused = false,
  testID = 'account-password',
}: Props) {
  const { colors, typography } = useTheme();
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(value);

  return (
    <View>
      <View
        style={[styles.password, { borderColor: focused ? colors.accent : colors.border }]}
        testID={`${testID}-container`}
      >
        <TextInput
          accessibilityLabel={i18n.t('auth.password')}
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder ?? i18n.t('auth.password')}
          placeholderTextColor={colors.textDisabled}
          secureTextEntry={!visible}
          autoComplete={autoComplete}
          style={[styles.passwordInput, { color: '#1a1a1a', fontFamily: typography.fontFamily.regular }]}
        />
        <TouchableOpacity
          accessibilityRole="button"
          testID={`${testID}-toggle`}
          accessibilityLabel={visible ? i18n.t('account.hide') : i18n.t('account.show')}
          onPress={() => setVisible(!visible)}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 10, letterSpacing: 1.3 }}>
            {visible ? i18n.t('account.hide') : i18n.t('account.show')}
          </Text>
        </TouchableOpacity>
      </View>
      {showStrength && strength > 0 ? (
        <View accessibilityLabel={i18n.t(`account.strength${strength}`)} style={styles.strength}>
          {[0, 1, 2, 3].map((n) => (
            <View
              key={n}
              style={[styles.segment, { backgroundColor: n < strength ? colors.accent : colors.border }]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  password: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  passwordInput: { flex: 1, fontSize: 15 },
  strength: { flexDirection: 'row', gap: 4, marginTop: 6 },
  segment: { flex: 1, height: 3 },
});
