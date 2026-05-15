import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function MountainDecoration({ color }: { color: string }) {
  return (
    <View style={styles.mountainWrap} pointerEvents="none">
      <View style={[styles.mountainBack, { borderBottomColor: color }]} />
      <View style={[styles.mountainFront, { borderBottomColor: color }]} />
    </View>
  );
}

type Props = {
  label: string;
  title: string;
  subtitle: string;
  onPress: () => void;
};

export function ProBanner({ label, title, subtitle, onPress }: Props) {
  const { colors, typography, scheme } = useTheme();

  const bg = scheme === 'light' ? colors.surface : '#2A2A2A';
  const border = scheme === 'light' ? colors.accent : '#3A3A3A';
  const mountainColor = scheme === 'light' ? 'rgba(178,140,110,0.15)' : 'rgba(178,140,110,0.12)';

  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: bg, borderColor: border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.accent, fontFamily: typography.fontFamily.semiBold }]}>
          {label}
        </Text>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.fontFamily.bold }]}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: typography.fontFamily.regular }]}>
          {subtitle}
        </Text>
      </View>
      <MountainDecoration color={mountainColor} />
      <Ionicons name="arrow-forward" size={18} color={colors.accent} style={styles.arrow} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    overflow: 'hidden',
  },
  content: { flex: 1, gap: 4 },
  label: { fontSize: 10, letterSpacing: 1.5, lineHeight: Math.round(10 * 1.5) },
  title: { fontSize: 18, lineHeight: Math.round(18 * 1.3) },
  subtitle: { fontSize: 12, lineHeight: Math.round(12 * 1.5) },
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
  arrow: { marginLeft: 4 },
});
