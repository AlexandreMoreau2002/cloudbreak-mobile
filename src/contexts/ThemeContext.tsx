import { useColorScheme } from 'react-native';
import { Typography } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/spacing';
import { Colors, type ColorScheme, type ThemeColors } from '@/constants/colors';
import { useCallback, useState, useMemo, createContext, useContext } from 'react';

interface ThemeContextValue {
  colors: ThemeColors;
  scheme: ColorScheme;
  radius: typeof Radius;
  spacing: typeof Spacing;
  typography: typeof Typography;
  toggleScheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<ColorScheme | null>(null);

  const scheme: ColorScheme = override ?? (systemScheme === 'dark' ? 'dark' : 'light');

  const toggleScheme = useCallback(() => {
    setOverride(prev => prev === 'light' || prev === null
      ? (systemScheme === 'dark' ? 'light' : 'dark')
      : 'light'
    );
  }, [systemScheme]);

  const value = useMemo<ThemeContextValue>(() => ({
    colors: Colors[scheme],
    spacing: Spacing,
    typography: Typography,
    radius: Radius,
    scheme,
    toggleScheme,
  }), [scheme, toggleScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
