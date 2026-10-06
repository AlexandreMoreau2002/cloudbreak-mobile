import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PaywallScreen } from '@/components/paywall';
import type { PaywallProduct } from './types';

jest.mock('@/services/analytics', () => ({ track: jest.fn() }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => {} }));
jest.mock('@/hooks/useLegalLinks', () => ({ useLegalLinks: () => ({ openLegalLink: jest.fn() }) }));
jest.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ scheme: 'light', colors: { accent: '#B28C6E', border: '#E9E4DA', textPrimary: '#1A1A1A', textSecondary: '#5E5E5E' }, spacing: { xs: 4, sm: 8, md: 16, lg: 24 }, typography: { fontFamily: { regular: 'regular', semiBold: 'semiBold' }, fontSize: { sm: 14, md: 16 } } }) }));
jest.mock('@/utils/i18n', () => ({
  t: (key: string, options?: Record<string, string>) => {
    const values: Record<string, string> = {
      'paywall.trialBadge': 'Essai gratuit 7 jours', 'paywall.title': 'Prévisions illimitées', 'paywall.subtitle': 'Toutes vos prévisions', 'paywall.billingMonthly': 'Mensuel', 'paywall.billingAnnual': 'Annuel', 'paywall.billingSavings': '−25%', 'paywall.ctaStart': 'Commencer l’essai gratuit', 'paywall.periodMonth': 'mois', 'paywall.periodYear': 'an', 'paywall.ctaTrialDisclosure': '7 jours gratuits, puis {{price}}/{{period}}. Renouvellement automatique sauf annulation.', 'paywall.ctaRenewalDisclosure': '{{price}}/{{period}}. Renouvellement automatique sauf annulation.', 'paywall.ctaRestore': 'Restaurer un achat', 'paywall.dismiss': 'Continuer sans abonnement', 'paywall.noCommitment': 'Sans engagement', 'paywall.storeUnavailableTitle': 'Abonnements indisponibles', 'paywall.storeUnavailableMessage': 'Impossible de charger les offres Apple.', 'paywall.purchaseFailedTitle': 'Achat non finalisé', 'paywall.purchaseFailedMessage': 'L’achat n’a pas abouti.', 'paywall.verificationFailedMessage': 'Validation indisponible.', 'common.retry': 'Réessayer', 'common.loading': 'Chargement…', 'legal.privacy': 'Confidentialité', 'legal.cgu': 'CGU',
    };
    return Object.entries(options ?? {}).reduce((value, [name, replacement]) => value.replace(`{{${name}}}`, replacement), values[key] ?? key);
  },
}));

const products: PaywallProduct[] = [
  { billingPeriod: 'monthly', displayPrice: '4,99 €', hasFreeTrial: true },
  { billingPeriod: 'annual', displayPrice: '44,99 €', hasFreeTrial: true },
];
const onDismiss = jest.fn();
const onSelectPlan = jest.fn().mockResolvedValue(undefined);
const onRestore = jest.fn().mockResolvedValue(undefined);
const onRetryProducts = jest.fn().mockResolvedValue(undefined);

function renderPaywall(overrides: Partial<React.ComponentProps<typeof PaywallScreen>> = {}) {
  return render(<PaywallScreen visible onDismiss={onDismiss} products={products} isLoading={false} error={null} onSelectPlan={onSelectPlan} onRestore={onRestore} onRetryProducts={onRetryProducts} {...overrides} />);
}

describe('PaywallScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the StoreKit localised price for the selected plan', () => {
    renderPaywall();
    expect(screen.getByTestId('paywall-annual-price')).toHaveTextContent('44,99 €');
    expect(screen.getByTestId('paywall-cta-trial-end-note')).toHaveTextContent('7 jours gratuits, puis 44,99 €/an. Renouvellement automatique sauf annulation.');
    fireEvent.press(screen.getByTestId('paywall-billing-monthly'));
    expect(screen.getByTestId('paywall-monthly-price')).toHaveTextContent('4,99 €');
    expect(screen.getByTestId('paywall-cta-trial-end-note')).toHaveTextContent('7 jours gratuits, puis 4,99 €/mois. Renouvellement automatique sauf annulation.');
  });

  it('only shows the seven-day badge and disclosure for an eligible StoreKit offer', () => {
    renderPaywall({ products: [{ billingPeriod: 'annual', displayPrice: '44,99 €', hasFreeTrial: false }] });
    expect(screen.queryByText('Essai gratuit 7 jours')).toBeNull();
    expect(screen.getByTestId('paywall-cta-trial-end-note')).toHaveTextContent('44,99 €/an. Renouvellement automatique sauf annulation.');
  });

  it('disables purchase and offers a retry when StoreKit does not load the selected product', () => {
    renderPaywall({ products: [], error: 'store_unavailable' });
    expect(screen.getByTestId('paywall-cta-button').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByTestId('paywall-store-retry'));
    expect(onRetryProducts).toHaveBeenCalledTimes(1);
  });

  it('calls real purchase and restoration actions', () => {
    renderPaywall();
    fireEvent.press(screen.getByTestId('paywall-cta-button'));
    fireEvent.press(screen.getByTestId('paywall-restore-button'));
    expect(onSelectPlan).toHaveBeenCalledWith('annual');
    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it.each(['purchase_failed', 'verification_failed'] as const)('shows a recoverable %s state', (error) => {
    renderPaywall({ error });
    expect(screen.getByText('Achat non finalisé')).toBeTruthy();
    fireEvent.press(screen.getByTestId('paywall-purchase-retry'));
    expect(onSelectPlan).toHaveBeenCalledWith('annual');
  });
});
