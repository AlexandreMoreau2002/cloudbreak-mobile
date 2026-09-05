import { useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface CodeInputProps { value: string; onChange: (value: string) => void; error?: boolean; }

export function CodeInput({ value, onChange, error = false }: CodeInputProps) {
  const { colors, typography } = useTheme();
  const refs = useRef<(TextInput | null)[]>([]);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('').map((d) => d.trim());
  function change(index: number, text: string) {
    const clean = text.replace(/\D/g, '').slice(0, 6);
    if (clean.length > 1) { onChange(clean); refs.current[5]?.focus(); return; }
    const next = digits; next[index] = clean;
    onChange(next.join(''));
    if (clean && index < 5) refs.current[index + 1]?.focus();
  }
  return <View style={styles.row}>{digits.map((digit, index) => <TextInput
    key={index} ref={(ref) => { refs.current[index] = ref; }} testID={`code-input-${index}`}
    value={digit} onChangeText={(text) => change(index, text)} maxLength={1} keyboardType="number-pad"
    autoComplete="one-time-code" textContentType="oneTimeCode" selectTextOnFocus
    onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Backspace' && !digit && index > 0) refs.current[index - 1]?.focus(); }}
    style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: error ? '#C25C4A' : digit ? colors.accent : colors.border, fontFamily: typography.fontFamily.semiBold }]}
  />)}</View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 8, justifyContent: 'center' }, input: { width: 46, height: 58, borderWidth: 1.5, borderRadius: 14, textAlign: 'center', fontSize: 24 } });
