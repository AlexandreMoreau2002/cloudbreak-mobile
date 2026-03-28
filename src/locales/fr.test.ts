import fr from '@/locales/fr';

describe('locale fr', () => {
  it('expose les clés critiques de navigation, profile et home', () => {
    expect(fr.nav.home).toBe('Accueil');
    expect(fr.profile.languageEn).toBe('EN');
    expect(fr.home.today).toBe("Aujourd'hui");
  });

  it('expose les libellés de score attendus', () => {
    expect(fr.score.label.none).toBe('Pas de nuages');
    expect(fr.score.context.none.low_cloud_cover).toContain('Pas de nuages');
  });
});
