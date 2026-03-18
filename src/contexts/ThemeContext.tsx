import { useColorScheme } from 'react-native';
import { Typography } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { useMemo, createContext, useContext } from 'react';
import { Colors, type ColorScheme, type ThemeColors } from '@/constants/colors';

interface ThemeContextValue {
  colors: ThemeColors;
  scheme: ColorScheme;
  radius: typeof Radius;
  spacing: typeof Spacing;
  typography: typeof Typography;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const scheme: ColorScheme = systemScheme === 'dark' ? 'dark' : 'light';

  const value = useMemo<ThemeContextValue>(() => ({
    colors: Colors[scheme],
    spacing: Spacing,
    typography: Typography,
    radius: Radius,
    scheme,
  }), [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
