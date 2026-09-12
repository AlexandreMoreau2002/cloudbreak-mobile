import { useTheme } from '@/contexts/ThemeContext';
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  style?: ViewStyle;
  color?: string;
}

export function LoadingSpinner({ size = 'large', style, color }: LoadingSpinnerProps) {
  const { colors } = useTheme();

  return (
    <View testID="loading-spinner" style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color ?? colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
