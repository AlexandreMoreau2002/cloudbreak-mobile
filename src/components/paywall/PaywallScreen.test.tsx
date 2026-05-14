/**
 * PaywallScreen — tests unitaires.
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { PaywallScreen } from '@/components/paywall';

jest.mock('@/utils/i18n', () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      'paywall.title': 'Débloquer les prévisions illimitées',
      'paywall.subtitle': 'Accédez à toutes vos prévisions, sans limite quotidienne.',
      'paywall.trialBadge': 'Essai gratuit 7 jours',
      'paywall.billingMonthly': 'Mensuel',
      'paywall.billingAnnual': 'Annuel',
      'paywall.billingSavings': '−33%',
      'paywall.priceMonthly': '5€ / mois',
      'paywall.priceAnnual': '45€ / an',
      'paywall.ctaStart': "Commencer l'essai gratuit",
      'paywall.ctaRestore': 'Restaurer un achat',
      'paywall.dismiss': 'Continuer sans abonnement',
    };
    return map[key] ?? key;
  },
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
    mockScheme = 'light';
  });

  it('affiche_le_paywall_quand_visible_true', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    expect(screen.getByTestId('paywall-sheet')).toBeTruthy();
  });

  it('affiche_le_titre_et_le_badge_essai', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    expect(screen.getByText('Débloquer les prévisions illimitées')).toBeTruthy();
    expect(screen.getByText('Essai gratuit 7 jours')).toBeTruthy();
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

  it('selectionne_annuel_par_defaut', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    // CTA par défaut déclenche 'annual'
    fireEvent.press(screen.getByTestId('paywall-cta-button'));
    expect(mockOnSelectPlan).toHaveBeenCalledWith('annual');
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

  it('fonctionne_sans_onSelectPlan_prop', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} />,
    );
    expect(screen.getByTestId('paywall-sheet')).toBeTruthy();
    // Ne doit pas crasher même sans onSelectPlan
    fireEvent.press(screen.getByTestId('paywall-cta-button'));
  });

  it('affiche_le_bouton_restaurer_un_achat_et_accepte_le_press', () => {
    render(
      <PaywallScreen visible onDismiss={mockOnDismiss} onSelectPlan={mockOnSelectPlan} />,
    );
    expect(screen.getByTestId('paywall-restore-button')).toBeTruthy();
    expect(screen.getByText('Restaurer un achat')).toBeTruthy();
    // Le press ne fait rien pour le moment mais ne doit pas crasher
    fireEvent.press(screen.getByTestId('paywall-restore-button'));
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
