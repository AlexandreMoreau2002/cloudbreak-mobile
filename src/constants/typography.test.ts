import { Typography } from '@/constants/typography';

describe('typography', () => {
  it('expose les familles Josefin Sans attendues', () => {
    expect(Typography.fontFamily).toMatchObject({
      regular: 'JosefinSans_400Regular',
      light: 'JosefinSans_300Light',
      semiBold: 'JosefinSans_600SemiBold',
      bold: 'JosefinSans_700Bold',
    });
  });

  it('expose les tailles et interlignes clés', () => {
    expect(Typography.fontSize.hero).toBe(72);
    expect(Typography.fontSize.sm).toBe(14);
    expect(Typography.lineHeight).toMatchObject({
      tight: 1.2,
      normal: 1.5,
      loose: 1.8,
    });
  });
});
