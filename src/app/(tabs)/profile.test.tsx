import React from 'react';
import ProfileScreen from '@/app/(tabs)/profile';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockOpenAccount = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 12, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@/utils/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

jest.mock('@/services/analytics', () => ({ track: jest.fn() }));

const mockSignOut = jest.fn();
const mockSignOutToAnonymous = jest.fn().mockResolvedValue(null);
const mockDeleteAccount = jest.fn();
const mockToggleScheme = jest.fn();
const mockToggleLocale = jest.fn();
let mockSession: { user: { email?: string; is_anonymous?: boolean } } | null = { user: { email: 'test@example.com' } };

const mockRefreshLocationPermission = jest.fn();
let mockLocationPermission: 'undetermined' | 'granted' | 'denied' = 'denied';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
    signOutToAnonymous: mockSignOutToAnonymous,
    deleteAccount: mockDeleteAccount,
    session: mockSession,
    locationPermission: mockLocationPermission,
    refreshLocationPermission: mockRefreshLocationPermission,
  }),
}));

const mockShowPaywall = jest.fn();
jest.mock('@/contexts/PaywallContext', () => ({
  usePaywall: () => ({ showPaywall: mockShowPaywall }),
}));

jest.mock('@/contexts/AccountGateContext', () => ({
  useAccountGate: () => ({ openAccount: mockOpenAccount }),
}));

const mockSetSelectedPeak = jest.fn();
jest.mock('@/contexts/SelectedPeakContext', () => ({
  useSelectedPeak: () => ({ setSelectedPeak: mockSetSelectedPeak }),
}));

const mockResetOnboarding = jest.fn();
jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    completed: true,
    hydrated: true,
    completeOnboarding: jest.fn(),
    resetOnboarding: mockResetOnboarding,
  }),
}));

let mockLocale: 'fr' | 'en' = 'fr';
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: mockLocale, toggleLocale: mockToggleLocale }),
}));

const mockOpenLegalLink = jest.fn();
jest.mock('@/hooks/useLegalLinks', () => ({
  useLegalLinks: () => ({ openLegalLink: mockOpenLegalLink }),
}));

const mockOpenLocationSettings = jest.fn();
jest.mock('@/hooks/useLocationSettingsLink', () => ({
  useLocationSettingsLink: () => ({ openLocationSettings: mockOpenLocationSettings }),
}));

const mockToggleNewsletter = jest.fn();
let mockNewsletter = {
  optedIn: false,
  state: { status: 'success' as const, data: false },
  toggle: mockToggleNewsletter,
};
jest.mock('@/hooks/useNewsletterConsent', () => ({
  useNewsletterConsent: () => mockNewsletter,
}));

let mockScheme = 'light';
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    scheme: mockScheme,
    toggleScheme: mockToggleScheme,
    colors: {
      background: '#EFE8DC',
      surface: '#F7F5F1',
      border: '#E9E4DA',
      accent: '#B28C6E',
      textPrimary: '#1A1A1A',
      textSecondary: '#5E5E5E',
    },
    typography: {
      fontFamily: { regular: 'regular', semiBold: 'semiBold', bold: 'bold' },
      fontSize: { lg: 22, sm: 14 },
    },
  }),
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScheme = 'light';
    mockLocale = 'fr';
    mockSession = { user: { email: 'test@example.com' } };
    mockSignOutToAnonymous.mockResolvedValue(null);
    mockLocationPermission = 'denied';
    mockNewsletter = {
      optedIn: false,
      state: { status: 'success', data: false },
      toggle: mockToggleNewsletter,
    };
  });

  it('s\'affiche sans erreur', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.title')).toBeTruthy();
  });

  it('affiche la carte utilisateur avec email', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('test@example.com')).toBeTruthy();
  });

  it('affiche le profil sans email quand la session est absente', () => {
    mockSession = null;

    const { getByText, queryByText } = render(<ProfileScreen />);

    expect(getByText('profile.title')).toBeTruthy();
    expect(queryByText('test@example.com')).toBeNull();
  });

  it('affiche la carte invitée sans actions sensibles', () => {
    mockSession = { user: { is_anonymous: true } };

    const { getByText, queryByText } = render(<ProfileScreen />);

    expect(getByText('profile.guest.title')).toBeTruthy();
    expect(getByText('profile.guest.subtitle')).toBeTruthy();
    expect(getByText('profile.guest.createAccount')).toBeTruthy();
    expect(getByText('profile.guest.login')).toBeTruthy();
    expect(queryByText('profile.signOut')).toBeNull();
    expect(queryByText('profile.deleteAccount')).toBeNull();
    expect(queryByText('test@example.com')).toBeNull();
  });

  it('ouvre la création de compte depuis la carte invitée', () => {
    mockSession = { user: { is_anonymous: true } };
    const { getByText } = render(<ProfileScreen />);

    fireEvent.press(getByText('profile.guest.createAccount'));

    expect(mockOpenAccount).toHaveBeenCalledWith('creation');
  });

  it('ouvre la connexion depuis la carte invitée', () => {
    mockSession = { user: { is_anonymous: true } };
    const { getByText } = render(<ProfileScreen />);

    fireEvent.press(getByText('profile.guest.login'));

    expect(mockOpenAccount).toHaveBeenCalledWith('login');
  });

  it('affiche le banner pro', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.proBannerTitle')).toBeTruthy();
  });

  it('ouvre le paywall avec le trigger profile_banner au clic sur le banner pro', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.proBannerTitle'));
    expect(mockShowPaywall).toHaveBeenCalledWith('profile_banner');
  });

  it('affiche la ligne apparence en mode light', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.appearance')).toBeTruthy();
    expect(getByText('profile.appearanceLight')).toBeTruthy();
  });

  it('affiche la ligne apparence en mode dark', () => {
    mockScheme = 'dark';
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.appearanceDark')).toBeTruthy();
  });

  it('appelle toggleScheme au clic sur la ligne apparence', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.appearance'));
    expect(mockToggleScheme).toHaveBeenCalledTimes(1);
  });

  it('affiche la ligne langue avec la valeur courante en locale fr', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.language')).toBeTruthy();
    expect(getByText('profile.languageFrLabel')).toBeTruthy();
  });

  it('affiche la valeur langue en locale en', () => {
    mockLocale = 'en';
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.languageEnLabel')).toBeTruthy();
  });

  it('appelle toggleLocale au clic sur la ligne langue', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.language'));
    expect(mockToggleLocale).toHaveBeenCalledTimes(1);
  });

  it('affiche le bouton de déconnexion', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.signOut')).toBeTruthy();
  });

  it('crée une vraie session invitée au clic sur se déconnecter', async () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.signOut'));
    await waitFor(() => expect(mockSignOutToAnonymous).toHaveBeenCalledTimes(1));
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('tracks signed_out then calls signOut', () => {
    const { track } = jest.requireMock('@/services/analytics');
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.signOut'));
    expect(track).toHaveBeenCalledWith('signed_out');
    expect(mockSignOutToAnonymous).toHaveBeenCalledTimes(1);
  });

  it('propose de réessayer si la session invitée ne peut pas être créée', async () => {
    mockSignOutToAnonymous.mockResolvedValueOnce(new Error('Anonymous sign-ins are disabled'));
    const { getByText, getByTestId } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.signOut'));
    await waitFor(() => expect(getByTestId('profile-signout-error')).toBeTruthy());

    fireEvent.press(getByTestId('profile-signout-retry'));
    await waitFor(() => expect(mockSignOutToAnonymous).toHaveBeenCalledTimes(2));
  });

  it('tracks theme_toggled then calls toggleScheme', () => {
    const { track } = jest.requireMock('@/services/analytics');
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.appearance'));
    expect(track).toHaveBeenCalledWith('theme_toggled', { scheme: 'dark' });
    expect(mockToggleScheme).toHaveBeenCalledTimes(1);
  });

  it('tracks theme_toggled vers light quand le scheme courant est dark', () => {
    mockScheme = 'dark';
    const { track } = jest.requireMock('@/services/analytics');
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.appearance'));
    expect(track).toHaveBeenCalledWith('theme_toggled', { scheme: 'light' });
  });

  it('tracks language_toggled then calls toggleLocale', () => {
    const { track } = jest.requireMock('@/services/analytics');
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.language'));
    expect(track).toHaveBeenCalledWith('language_toggled', { locale: 'en' });
    expect(mockToggleLocale).toHaveBeenCalledTimes(1);
  });

  it('tracks language_toggled vers fr quand la locale courante est en', () => {
    mockLocale = 'en';
    const { track } = jest.requireMock('@/services/analytics');
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.language'));
    expect(track).toHaveBeenCalledWith('language_toggled', { locale: 'fr' });
  });

  it('tracks delete_account_initiated when opening the delete modal', () => {
    const { track } = jest.requireMock('@/services/analytics');
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.deleteAccount'));
    expect(track).toHaveBeenCalledWith('delete_account_initiated');
  });

  it('ouvre puis ferme la modale de suppression de compte', () => {
    const { getByText } = render(<ProfileScreen />);

    fireEvent.press(getByText('profile.deleteAccount'));
    expect(getByText('profile.deleteAccountModal.title')).toBeTruthy();

    fireEvent.press(getByText('profile.deleteAccountModal.cancel'));
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('branche la confirmation de suppression sur deleteAccount', () => {
    const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

    fireEvent.press(getByText('profile.deleteAccount'));
    fireEvent.changeText(
      getByPlaceholderText('profile.deleteAccountModal.emailPlaceholder'),
      'test@example.com',
    );
    fireEvent.press(getByText('profile.deleteAccountModal.confirm'));

    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
  });

  it('affiche une erreur et arrête le chargement si deleteAccount rejette', async () => {
    mockDeleteAccount.mockRejectedValueOnce(new Error('Server error'));
    const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

    fireEvent.press(getByText('profile.deleteAccount'));
    fireEvent.changeText(
      getByPlaceholderText('profile.deleteAccountModal.emailPlaceholder'),
      'test@example.com',
    );
    fireEvent.press(getByText('profile.deleteAccountModal.confirm'));

    await waitFor(() => {
      expect(getByText('profile.deleteAccountModal.errorGeneric')).toBeTruthy();
    });
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
  });

  it('affiche la ligne newsletter avec la valeur désactivée par défaut', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.newsletter')).toBeTruthy();
    expect(getByText('profile.newsletterOff')).toBeTruthy();
  });

  it('affiche "Activée" quand le consentement newsletter est donné', () => {
    mockNewsletter = {
      optedIn: true,
      state: { status: 'success', data: true },
      toggle: mockToggleNewsletter,
    };
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('profile.newsletterOn')).toBeTruthy();
  });

  it('bascule le consentement newsletter et le tracke au clic', () => {
    const { track } = jest.requireMock('@/services/analytics');
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('profile.newsletter'));
    expect(track).toHaveBeenCalledWith('newsletter_consent_toggled', { opted_in: true });
    expect(mockToggleNewsletter).toHaveBeenCalledTimes(1);
  });

  it('masque la ligne newsletter pour une session invitée', () => {
    mockSession = { user: { is_anonymous: true } };
    const { queryByText } = render(<ProfileScreen />);
    expect(queryByText('profile.newsletter')).toBeNull();
  });

  it('affiche la section légale avec les trois entrées', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('legal.sectionTitle')).toBeTruthy();
    expect(getByText('legal.privacy')).toBeTruthy();
    expect(getByText('legal.cgu')).toBeTruthy();
    expect(getByText('legal.support')).toBeTruthy();
  });

  it('ouvre la politique de confidentialité au clic', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('legal.privacy'));
    expect(mockOpenLegalLink).toHaveBeenCalledWith('https://ops.cloudbreak-app.com/fr/privacy');
  });

  it("ouvre les conditions d'utilisation au clic", () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('legal.cgu'));
    expect(mockOpenLegalLink).toHaveBeenCalledWith('https://ops.cloudbreak-app.com/fr/cgu');
  });

  it('ouvre le lien mailto du support au clic', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('legal.support'));
    expect(mockOpenLegalLink).toHaveBeenCalledWith('mailto:contact@cloudbreak-app.com');
  });

  it('branche les boutons DEV sur le sandbox et le reset du sommet sélectionné', () => {
    const { getByText } = render(<ProfileScreen />);

    fireEvent.press(getByText('DEV · CloudLayerViz Sandbox'));
    expect(mockPush).toHaveBeenCalledWith('/sandbox');

    fireEvent.press(getByText('DEV · Reset sommet sélectionné'));
    expect(mockSetSelectedPeak).toHaveBeenCalledWith(null);

    fireEvent.press(getByText("DEV · Rejouer l'onboarding"));
    expect(mockResetOnboarding).toHaveBeenCalledTimes(1);
  });

  it('shows the location row with "Désactivée" when permission is denied and opens settings on press', () => {
    mockLocationPermission = 'denied';
    const { getByText } = render(<ProfileScreen />);

    expect(getByText('profile.locationDisabled')).toBeTruthy();
    fireEvent.press(getByText('profile.location'));

    expect(mockOpenLocationSettings).toHaveBeenCalledTimes(1);
  });

  it('shows "Activée" when permission is granted', () => {
    mockLocationPermission = 'granted';
    const { getByText } = render(<ProfileScreen />);

    expect(getByText('profile.locationEnabled')).toBeTruthy();
  });

  it('refreshes the location permission when the screen regains focus', () => {
    render(<ProfileScreen />);
    expect(mockRefreshLocationPermission).toHaveBeenCalled();
  });
});
