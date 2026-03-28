import en from '@/locales/en';

describe('locale en', () => {
  it('expose les clés critiques de navigation, profile et home', () => {
    expect(en.nav.home).toBe('Home');
    expect(en.profile.languageFr).toBe('FR');
    expect(en.home.today).toBe('Today');
  });

  it('expose les libellés de score attendus', () => {
    expect(en.score.label.none).toBe('No clouds');
    expect(en.score.context.none.low_cloud_cover).toContain('No clouds');
  });
});
