import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface CodeInputProps { value: string; onChange: (value: string) => void; error?: boolean; }

export function CodeInput({ value, onChange, error = false }: CodeInputProps) {
  const { colors, typography } = useTheme();
  const refs = useRef<(TextInput | null)[]>([]);
  const toSlots = (input: string): string[] => input.replace(/\D/g, '').slice(0, 6).split('').concat(['', '', '', '', '', '']).slice(0, 6);
  const [digits, setDigits] = useState<string[]>(() => toSlots(value));
  const lastEmittedValue = useRef(value);
  useEffect(() => {
    if (value !== lastEmittedValue.current) {
      setDigits(toSlots(value));
      lastEmittedValue.current = value;
    }
  }, [value]);
  function change(index: number, text: string) {
    const clean = text.replace(/\D/g, '').slice(0, 6);
    if (clean.length > 1) {
      const next = toSlots(clean);
      setDigits(next);
      lastEmittedValue.current = clean;
      onChange(clean);
      refs.current[Math.min(clean.length - 1, 5)]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    const nextValue = next.join('');
    lastEmittedValue.current = nextValue;
    onChange(nextValue);
    if (clean && index < 5) refs.current[index + 1]?.focus();
  }
  return <View style={styles.row}>{digits.map((digit, index) => <TextInput
    key={index} ref={(ref) => { refs.current[index] = ref; }} testID={`code-input-${index}`}
    value={digit} onChangeText={(text) => change(index, text)} maxLength={6} keyboardType="number-pad"
    autoComplete="one-time-code" textContentType="oneTimeCode" selectTextOnFocus
    onKeyPress={({ nativeEvent }) => {
      if (nativeEvent.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
      if (nativeEvent.key === 'ArrowRight' && index < 5) refs.current[index + 1]?.focus();
      if (nativeEvent.key === 'Backspace' && !digit && index > 0) refs.current[index - 1]?.focus();
    }}
    style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: error ? '#C25C4A' : digit ? colors.accent : colors.border, fontFamily: typography.fontFamily.semiBold }]}
  />)}</View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 8, justifyContent: 'center' }, input: { width: 46, height: 58, borderWidth: 1.5, borderRadius: 14, textAlign: 'center', fontSize: 24 } });
