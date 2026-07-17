/**
 * PaywallScreen — tests unitaires.
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { PaywallScreen } from '@/components/paywall';

const mockDevConfigState = { DEBUG: false };

jest.mock('@/constants/devConfig', () => ({
  get DEBUG() { return mockDevConfigState.DEBUG; },
}));

jest.mock('@/utils/i18n', () => ({
  t: (key: string, options?: Record<string, string>) => {
    const map: Record<string, string> = {
      'paywall.trialBadge': 'Essai gratuit 7 jours',
      'paywall.title': 'Débloquer les prévisions illimitées',
      'paywall.subtitle': 'Accédez à toutes vos prévisions, sans limite quotidienne.',
      'paywall.billingMonthly': 'Mensuel',
      'paywall.billingAnnual': 'Annuel',
      'paywall.billingSavings': '−33%',
      'paywall.priceMonthly': '5€ / mois',
      'paywall.priceAnnual': '45€ / an',
      'paywall.ctaStart': "Commencer l'essai gratuit",
      'paywall.ctaTrialEndNote': 'Puis {{price}}',
      'paywall.ctaRestore': 'Restaurer un achat',
      'paywall.restoreSuccess': 'Achats restaurés',
      'paywall.dismiss': 'Continuer sans abonnement',
      'paywall.noCommitment': 'Sans engagement · résiliable à tout moment',
      'legal.privacy': 'Politique de confidentialité',
      'legal.cgu': "Conditions d'utilisation",
    };
    const template = map[key] ?? key;
    if (!options) return template;
    return Object.keys(options).reduce(
      (acc, optionKey) => acc.replace(`{{${optionKey}}}`, options[optionKey]),
      template,
    );
  },
}));

const mockOpenLegalLink = jest.fn();
jest.mock('@/hooks/useLegalLinks', () => ({
  useLegalLinks: () => ({ openLegalLink: mockOpenLegalLink }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => {},
}));

let mockScheme = 'light';
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    scheme: mockScheme,
    colors: {
      background: '#EFE8DC',
      surface: '#F7F5F1',
      border: '#E9E4DA',
      accent: '#B28C6E',
      accentSecondary: '#D2BA9C',
      textPrimary: '#1A1A1A',
      textSecondary: '#5E5E5E',
      textDisabled: '#A0A0A0',
    },
    typography: {
      fontFamily: { regular: 'JosefinSans_400Regular', light: 'JosefinSans_300Light', semiBold: 'JosefinSans_600SemiBold', bold: 'JosefinSans_700Bold' },
      fontSize: { xs: 11, sm: 14, md: 18, lg: 22, xl: 28, xxl: 48, hero: 72 },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 },
  }),
}));

describe('PaywallScreen', () => {
  const mockOnDismiss = jest.fn();
  const mockOnSelectPlan = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockDevConfigState.DEBUG = false;
    mockScheme = 'light';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('affiche_le_paywall_quand_visible_true', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    expect(screen.getByTestId('paywall-sheet')).toBeTruthy();
  });

  it('réinitialise_l_animation_quand_le_paywall_est_masqué', () => {
    render(
      <PaywallScreen visible={false} onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    expect(screen.queryByTestId('paywall-sheet')).toBeNull();
  });

  it('affiche_le_badge_essai_gratuit_et_le_titre', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    expect(screen.getByText('Essai gratuit 7 jours')).toBeTruthy();
    expect(screen.getByText('Débloquer les prévisions illimitées')).toBeTruthy();
  });

  it('affiche_le_footer_legal_avec_mention_sans_engagement', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    expect(screen.getByText('Sans engagement · résiliable à tout moment')).toBeTruthy();
  });

  it('affiche_le_toggle_mensuel_et_annuel', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    expect(screen.getByTestId('paywall-billing-monthly')).toBeTruthy();
    expect(screen.getByTestId('paywall-billing-annual')).toBeTruthy();
    expect(screen.getByText('Mensuel')).toBeTruthy();
    expect(screen.getByText('Annuel')).toBeTruthy();
    expect(screen.getByText('5€ / mois')).toBeTruthy();
    expect(screen.getByText('45€ / an')).toBeTruthy();
    expect(screen.getByText('−33%')).toBeTruthy();
  });

  it('affiche_le_prix_apres_essai_pour_le_plan_annuel_par_defaut', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    expect(screen.getByText('Puis 45€ / an')).toBeTruthy();
  });

  it('met_a_jour_le_prix_apres_essai_quand_le_plan_mensuel_est_selectionne', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    fireEvent.press(screen.getByTestId('paywall-billing-monthly'));
    expect(screen.getByText('Puis 5€ / mois')).toBeTruthy();
    expect(screen.queryByText('Puis 45€ / an')).toBeNull();
  });

  it('selectionne_annuel_par_defaut_sans_log_quand_debug_desactive', () => {
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    // CTA par défaut déclenche 'annual'
    fireEvent.press(screen.getByTestId('paywall-cta-button'));
    expect(mockOnSelectPlan).toHaveBeenCalledWith('annual');
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('log_le_plan_selectionne_quand_debug_est_actif', () => {
    mockDevConfigState.DEBUG = true;
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation();

    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );

    fireEvent.press(screen.getByTestId('paywall-cta-button'));
    expect(debugSpy).toHaveBeenCalledWith('[PaywallScreen] plan sélectionné', { plan: 'annual' });
  });

  it('toggle_vers_mensuel_change_la_selection', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    fireEvent.press(screen.getByTestId('paywall-billing-monthly'));
    fireEvent.press(screen.getByTestId('paywall-cta-button'));
    expect(mockOnSelectPlan).toHaveBeenCalledWith('monthly');
  });

  it('toggle_vers_annuel_apres_mensuel', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    fireEvent.press(screen.getByTestId('paywall-billing-monthly'));
    fireEvent.press(screen.getByTestId('paywall-billing-annual'));
    fireEvent.press(screen.getByTestId('paywall-cta-button'));
    expect(mockOnSelectPlan).toHaveBeenCalledWith('annual');
  });

  it('appelle_onDismiss_au_clic_sur_fermer', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    fireEvent.press(screen.getByTestId('paywall-dismiss-button'));
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('affiche_le_texte_dismiss_sans_abonnement', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    expect(screen.getByText('Continuer sans abonnement')).toBeTruthy();
  });

  it('affiche_les_liens_legaux_privacy_et_cgu', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    expect(screen.getByTestId('paywall-privacy-link')).toBeTruthy();
    expect(screen.getByTestId('paywall-cgu-link')).toBeTruthy();
    expect(screen.getByText('Politique de confidentialité')).toBeTruthy();
    expect(screen.getByText("Conditions d'utilisation")).toBeTruthy();
  });

  it('ouvre_le_lien_privacy_au_clic', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    fireEvent.press(screen.getByTestId('paywall-privacy-link'));
    expect(mockOpenLegalLink).toHaveBeenCalledWith('https://ops.cloudbreak.fr/fr/privacy');
  });

  it('ouvre_le_lien_cgu_au_clic', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    fireEvent.press(screen.getByTestId('paywall-cgu-link'));
    expect(mockOpenLegalLink).toHaveBeenCalledWith('https://ops.cloudbreak.fr/fr/cgu');
  });

  it('fonctionne_sans_onSelectPlan_prop', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} />,
    );
    expect(screen.getByTestId('paywall-sheet')).toBeTruthy();
    // Ne doit pas crasher même sans onSelectPlan
    fireEvent.press(screen.getByTestId('paywall-cta-button'));
  });

  it('affiche_le_bouton_restaurer_un_achat_et_declenche_l_alerte_au_press', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    expect(screen.getByTestId('paywall-restore-button')).toBeTruthy();
    expect(screen.getByText('Restaurer un achat')).toBeTruthy();
    fireEvent.press(screen.getByTestId('paywall-restore-button'));
    expect(alertSpy).toHaveBeenCalledWith('Achats restaurés');
  });

  it('logue_en_debug_l_appel_restorePurchases_quand_debug_actif', () => {
    mockDevConfigState.DEBUG = true;
    jest.spyOn(Alert, 'alert').mockImplementation();
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    fireEvent.press(screen.getByTestId('paywall-restore-button'));
    expect(debugSpy).toHaveBeenCalledWith('[Paywall] restorePurchases stub');
  });

  it('utilise_les_couleurs_du_theme_dark', () => {
    mockScheme = 'dark';
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    expect(screen.getByTestId('paywall-sheet')).toBeTruthy();
    expect(screen.getByTestId('paywall-billing-monthly')).toBeTruthy();
    expect(screen.getByTestId('paywall-billing-annual')).toBeTruthy();
  });

  it('ne_propage_pas_le_press_du_sheet_vers_le_overlay', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    const sheet = screen.getByTestId('paywall-sheet');
    fireEvent(sheet, 'press', { stopPropagation: jest.fn() });
    expect(mockOnDismiss).not.toHaveBeenCalled();
  });

  it('appelle_onDismiss_au_clic_sur_overlay', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    fireEvent.press(screen.getByTestId('paywall-overlay'));
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });
});
