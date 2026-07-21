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
    // Onboarding narratif — rideau de nuages
    curtainSky: '#F7F2E6',
    curtain1: '#F4ECDF',
    curtain2: '#E9DDC7',
    curtainPeak: '#4A3A2C',
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
    // Onboarding narratif — rideau de nuages
    curtainSky: '#221E1A',
    curtain1: '#2A2520',
    curtain2: '#1F1B17',
    curtainPeak: '#C9A484',
  },
  score: {
    none: '#9E9E9E',    // conditions bloquantes — ⚫ Nuages au sol
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
  curtainSky: string;
  curtain1: string;
  curtain2: string;
  curtainPeak: string;
};
