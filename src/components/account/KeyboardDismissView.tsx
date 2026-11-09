import { type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface KeyboardDismissViewProps { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string; }

// Le pavé numérique iOS n'a pas de touche « OK » : on remonte le contenu au-dessus du clavier
// et on le ferme au toucher hors champ.
export function KeyboardDismissView({ children, style, testID }: KeyboardDismissViewProps) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Pressable accessible={false} onPress={Keyboard.dismiss} style={styles.flex} testID={testID ? `${testID}-dismiss` : undefined}>
        <View testID={testID} style={[styles.flex, style]}>{children}</View>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
