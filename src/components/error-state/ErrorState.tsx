import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface ErrorStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  actionTestID?: string;
  secondaryAction?: { label: string; onPress: () => void };
}

export function ErrorState({
  icon = 'cloud-offline-outline',
  title,
  message,
  action,
  actionTestID,
  secondaryAction,
}: ErrorStateProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons
        name={icon as React.ComponentProps<typeof Ionicons>['name']}
        size={40}
        color={colors.textSecondary}
        style={{ marginBottom: spacing.md }}
      />
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: typography.fontFamily.semiBold,
          fontSize: typography.fontSize.md,
          textAlign: 'center',
          marginBottom: message ? spacing.sm : 0,
        }}
      >
        {title}
      </Text>
      {message ? (
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.fontSize.sm,
            textAlign: 'center',
            marginBottom: action || secondaryAction ? spacing.md : 0,
          }}
        >
          {message}
        </Text>
      ) : null}
      {action ? (
        <TouchableOpacity
          testID={actionTestID}
          onPress={action.onPress}
          activeOpacity={0.8}
          style={[styles.cta, { backgroundColor: colors.accent }]}
        >
          <Text
            style={{
              color: colors.surface,
              fontFamily: typography.fontFamily.semiBold,
              fontSize: typography.fontSize.sm,
              letterSpacing: 1,
            }}
          >
            {action.label}
          </Text>
        </TouchableOpacity>
      ) : null}
      {secondaryAction ? (
        <TouchableOpacity
          onPress={secondaryAction.onPress}
          activeOpacity={0.7}
          style={styles.secondaryCta}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.fontSize.sm,
            }}
          >
            {secondaryAction.label}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  cta: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  secondaryCta: {
    marginTop: 12,
    paddingVertical: 4,
  },
});
