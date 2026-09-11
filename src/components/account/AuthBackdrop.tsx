import Svg, { Defs, Ellipse, FeGaussianBlur, Filter, G, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

/** Static « mer de nuages » artwork matching the 402 × 460 design handoff. */
export function AuthBackdrop() {
  const { scheme, colors } = useTheme();
  const dark = scheme === 'dark';
  const ridge = dark ? '#2E2823' : '#CBB79B';
  const ridgeBack = dark ? '#262220' : '#DCCDB4';

  return (
    <Svg
      testID="auth-backdrop"
      pointerEvents="none"
      accessibilityElementsHidden
      viewBox="0 0 402 460"
      preserveAspectRatio="xMidYMin slice"
      style={styles.canvas}
    >
      <Defs>
        <SvgLinearGradient id="auth-backdrop-dawn-gradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#D2BA9C" stopOpacity={dark ? 0.16 : 0.34} />
          <Stop offset="1" stopColor="#D2BA9C" stopOpacity={0} />
        </SvgLinearGradient>
        <SvgLinearGradient id="auth-backdrop-fade-gradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.background} stopOpacity={0} />
          <Stop offset="0.7" stopColor={colors.background} stopOpacity={0.86} />
          <Stop offset="1" stopColor={colors.background} stopOpacity={1} />
        </SvgLinearGradient>
        <Filter id="auth-backdrop-cloud-blur" x="-20%" y="-40%" width="140%" height="180%">
          <FeGaussianBlur stdDeviation={9} />
        </Filter>
      </Defs>
      <Rect testID="auth-backdrop-dawn" x="0" y="0" width="402" height="300" fill="url(#auth-backdrop-dawn-gradient)" />
      <Path testID="auth-backdrop-ridge-back" d="M-20 300 L96 196 L188 262 L272 176 L422 300 Z" fill={ridgeBack} opacity={dark ? 0.9 : 0.55} />
      <Path testID="auth-backdrop-ridge-front" d="M-20 320 L128 224 L236 300 L318 246 L422 320 Z" fill={ridge} opacity={dark ? 0.95 : 0.7} />
      <G testID="auth-backdrop-cloud-bands" opacity={dark ? 0.5 : 0.95} filter="url(#auth-backdrop-cloud-blur)">
        <Ellipse testID="auth-backdrop-cloud-1" cx="150" cy="300" rx="260" ry="26" fill={dark ? '#3A3A3A' : '#FBF9F5'} />
        <Ellipse testID="auth-backdrop-cloud-2" cx="290" cy="322" rx="220" ry="22" fill={dark ? '#333333' : '#F7F5F1'} />
        <Ellipse testID="auth-backdrop-cloud-3" cx="180" cy="346" rx="300" ry="30" fill={dark ? '#2E2E2E' : '#FBF9F5'} />
      </G>
      <Rect testID="auth-backdrop-fade" x="0" y="240" width="402" height="220" fill="url(#auth-backdrop-fade-gradient)" />
    </Svg>
  );
}

const styles = StyleSheet.create({ canvas: { ...StyleSheet.absoluteFillObject, height: 460, zIndex: 1 } });
