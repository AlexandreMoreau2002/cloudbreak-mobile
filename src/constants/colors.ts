export const Colors = {
  light: {
    background: '#EFE8DC',
    surface: '#F7F5F1',
    border: '#E9E4DA',
    accentSecondary: '#D2BA9C',
    accent: '#B28C6E',
    textPrimary: '#1A1A1A',
    textSecondary: '#5E5E5E',
    textDisabled: '#A0A0A0',
  },
  dark: {
    background: '#1A1A1A',
    surface: '#2A2A2A',
    border: '#3A3A3A',
    accentSecondary: '#D2BA9C',
    accent: '#B28C6E',
    textPrimary: '#F7F5F1',
    textSecondary: '#A0A0A0',
    textDisabled: '#5E5E5E',
  },
  score: {
    high: '#4CAF50',    // ≥ 70% — 🟢 Lève-toi tôt !
    medium: '#FF9800',  // 40-70% — 🟡 Ça peut le faire
    low: '#F44336',     // < 40% — 🔴 Pas ce coup-ci
  },
} as const;

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = {
  background: string;
  surface: string;
  border: string;
  accentSecondary: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
};
