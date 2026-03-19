import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Silhouette décorative montagne + mer de nuage — fond transparent pour l'écran login.
 * Dessinée en pur React Native (pas de dépendance SVG).
 */
export function MountainBackground({ opacity = 0.12 }: { opacity?: number }) {
  return (
    <View style={[StyleSheet.absoluteFillObject, { opacity }]} pointerEvents="none">
      {/* Ciel gradient */}
      <LinearGradient
        colors={['transparent', 'transparent']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Montagne arrière-plan (grande, droite) */}
      <View style={styles.mountainBack} />

      {/* Montagne avant-plan (gauche) */}
      <View style={styles.mountainFront} />

      {/* Mer de nuage — nappe horizontale */}
      <View style={styles.cloudLayer1} />
      <View style={styles.cloudLayer2} />
      <View style={styles.cloudLayer3} />
    </View>
  );
}

const styles = StyleSheet.create({
  mountainBack: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    width: 0,
    height: 0,
    borderLeftWidth: 160,
    borderRightWidth: 200,
    borderBottomWidth: 420,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#B28C6E',
  },
  mountainFront: {
    position: 'absolute',
    bottom: 0,
    left: -40,
    width: 0,
    height: 0,
    borderLeftWidth: 80,
    borderRightWidth: 220,
    borderBottomWidth: 280,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#8A6A50',
  },
  cloudLayer1: {
    position: 'absolute',
    bottom: 160,
    left: -20,
    right: -20,
    height: 60,
    backgroundColor: '#D2BA9C',
    borderRadius: 30,
    opacity: 0.6,
  },
  cloudLayer2: {
    position: 'absolute',
    bottom: 140,
    left: -40,
    right: -40,
    height: 50,
    backgroundColor: '#B28C6E',
    borderRadius: 25,
    opacity: 0.4,
  },
  cloudLayer3: {
    position: 'absolute',
    bottom: 110,
    left: -60,
    right: -60,
    height: 70,
    backgroundColor: '#D2BA9C',
    borderRadius: 35,
    opacity: 0.25,
  },
});
