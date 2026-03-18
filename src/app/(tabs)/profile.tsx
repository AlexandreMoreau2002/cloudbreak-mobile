import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function ProfileScreen() {
  const { colors, typography } = useTheme();
  const { signOut } = useAuth();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.textPrimary, fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.semiBold }}>
        Profil — à venir
      </Text>
      <TouchableOpacity style={[styles.button, { borderColor: colors.border }]} onPress={signOut}>
        <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm }}>
          Se déconnecter
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32 },
  button: { borderWidth: 1, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
});
