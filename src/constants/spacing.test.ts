import { Radius, Spacing } from '@/constants/spacing';

describe('spacing', () => {
  it('expose une grille 4px croissante', () => {
    expect(Spacing).toMatchObject({
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
      xxxl: 64,
    });
  });

  it('expose les rayons attendus', () => {
    expect(Radius).toMatchObject({
      sm: 8,
      md: 16,
      lg: 24,
      full: 9999,
    });
  });
});
