import en from '@/locales/en';
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

  it('expose le namespace reset avec les libellés critiques', () => {
    expect(fr.reset.requestTitle).toBe('Réinitialise ton mot de passe');
    expect(fr.reset.send).toBe('Envoyer le code');
    expect(fr.reset.resendWait).toBe('Renvoyer dans {{count}} s');
    expect(fr.reset.errorPassword).toBe('Mot de passe trop faible (8 caractères minimum).');
  });

  it('garde la parité des clés reset avec la locale anglaise', () => {
    expect(Object.keys(fr.reset).sort()).toEqual(Object.keys(en.reset).sort());
  });
});
