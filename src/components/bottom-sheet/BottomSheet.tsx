/**
 * BottomSheet — mécanique partagée des bottom sheets (Modal transparent,
 * scrim animé, translation verticale, grabber). Pas de librairie externe.
 *
 * testIDs dérivés de `testIDPrefix` : `${prefix}-overlay` (scrim cliquable)
 * et `${prefix}-sheet`. `modalTestID` est optionnel.
 */
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export const DEFAULT_SCRIM_COLOR = 'rgba(0,0,0,0.42)';

interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  testIDPrefix: string;
  modalTestID?: string;
  backgroundColor?: string;
  scrimColor?: string;
  /** Pilote l'animation d'ouverture (défaut : `visible`). */
  active?: boolean;
  children: ReactNode;
}

export function BottomSheet({
  visible,
  onDismiss,
  testIDPrefix,
  modalTestID,
  backgroundColor,
  scrimColor = DEFAULT_SCRIM_COLOR,
  active = visible,
  children,
}: BottomSheetProps) {
  const { colors, scheme } = useTheme();
  const overlayOpacity = useState(() => new Animated.Value(0))[0];
  const sheetTranslateY = useState(() => new Animated.Value(600))[0];

  useEffect(() => {
    if (active) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(600);
    }
  }, [active, overlayOpacity, sheetTranslateY]);

  return (
    <Modal testID={modalTestID} visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={onDismiss}>
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: scrimColor, opacity: overlayOpacity }]} pointerEvents="none" />
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} testID={`${testIDPrefix}-overlay`} />
        <Animated.View
          testID={`${testIDPrefix}-sheet`}
          style={[styles.sheet, { backgroundColor: backgroundColor ?? colors.surface, transform: [{ translateY: sheetTranslateY }] }]}
        >
          <View style={[styles.grabber, { backgroundColor: scheme === 'dark' ? 'rgba(247,245,241,0.25)' : 'rgba(26,26,26,0.18)' }]} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingBottom: 32,
  },
  grabber: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 10, marginBottom: 16 },
});
