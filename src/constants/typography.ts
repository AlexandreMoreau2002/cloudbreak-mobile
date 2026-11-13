// Échelle modulaire 1.25× base 14px — Josefin Sans
export const Typography = {
  fontFamily: {
    regular: 'JosefinSans_400Regular',
    light: 'JosefinSans_300Light',
    semiBold: 'JosefinSans_600SemiBold',
    bold: 'JosefinSans_700Bold',
  },
  fontSize: {
    xs: 11,    // captions, labels secondaires
    sm: 14,    // body, labels
    md: 18,    // body large, sous-titres
    lg: 22,    // titres secondaires
    xl: 28,    // titres principaux
    xxl: 48,   // score principal
    hero: 72,  // score hero sur écran principal
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    loose: 1.8,
  },
} as const;
