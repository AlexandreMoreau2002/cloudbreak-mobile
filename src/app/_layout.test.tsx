import React from 'react';
import RootLayout from '@/app/_layout';
import { render, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockHideAsync = jest.fn();
const mockUseFonts = jest.fn();
const mockUseSegments = jest.fn();
const mockUseAuth = jest.fn();
const mockUseOnboarding = jest.fn();

jest.mock('expo-router', () => ({
  Stack: () => null,
  useRouter: () => ({ replace: mockReplace }),
  useSegments: () => mockUseSegments(),
  SplashScreen: {
    hideAsync: () => mockHideAsync(),
    preventAutoHideAsync: jest.fn(),
  },
}));

jest.mock('@expo-google-fonts/josefin-sans', () => ({
  JosefinSans_300Light: 'JosefinSans_300Light',
  JosefinSans_400Regular: 'JosefinSans_400Regular',
  JosefinSans_600SemiBold: 'JosefinSans_600SemiBold',
  JosefinSans_700Bold: 'JosefinSans_700Bold',
  useFonts: (...args: unknown[]) => mockUseFonts(...args),
}));

jest.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/contexts/OnboardingContext', () => ({
  OnboardingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useOnboarding: () => mockUseOnboarding(),
}));

jest.mock('@/contexts/SelectedPeakContext', () => ({
  SelectedPeakProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/contexts/LanguageContext', () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLanguage: () => ({ locale: 'fr', toggleLocale: jest.fn() }),
}));

jest.mock('@/hooks/useAppSessionTracking', () => ({
  useAppSessionTracking: jest.fn(),
}));

describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFonts.mockReturnValue([true]);
    mockUseSegments.mockReturnValue(['(tabs)']);
    mockUseAuth.mockReturnValue({ session: null, loading: false });
    mockUseOnboarding.mockReturnValue({
      completed: true,
      hydrated: true,
      completeOnboarding: jest.fn(),
    });
  });

  it('rend null tant que les polices ne sont pas chargées', () => {
    mockUseFonts.mockReturnValue([false]);

    const { toJSON } = render(<RootLayout />);
    expect(toJSON()).toBeNull();
    expect(mockHideAsync).not.toHaveBeenCalled();
  });

  it('cache le splash puis redirige vers login sans session hors groupe auth', async () => {
    render(<RootLayout />);

    await waitFor(() => {
      expect(mockHideAsync).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  it('redirige vers les tabs avec une session dans le groupe auth', async () => {
    mockUseSegments.mockReturnValue(['(auth)']);
    mockUseAuth.mockReturnValue({ session: { access_token: 'token' }, loading: false });

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('ne redirige pas pendant le loading', async () => {
    mockUseAuth.mockReturnValue({ session: null, loading: true });

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockHideAsync).toHaveBeenCalledTimes(1);
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('ne redirige pas si une session existe déjà hors groupe auth', async () => {
    mockUseSegments.mockReturnValue(['(tabs)']);
    mockUseAuth.mockReturnValue({ session: { access_token: 'token' }, loading: false });

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockHideAsync).toHaveBeenCalledTimes(1);
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirige vers onboarding si le flag est absent et pas de session', async () => {
    mockUseSegments.mockReturnValue(['(tabs)']);
    mockUseAuth.mockReturnValue({ session: null, loading: false });
    mockUseOnboarding.mockReturnValue({
      completed: false,
      hydrated: true,
      completeOnboarding: jest.fn(),
    });

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('redirige vers onboarding si le flag est absent même avec une session existante', async () => {
    mockUseSegments.mockReturnValue(['(tabs)']);
    mockUseAuth.mockReturnValue({ session: { access_token: 'token' }, loading: false });
    mockUseOnboarding.mockReturnValue({
      completed: false,
      hydrated: true,
      completeOnboarding: jest.fn(),
    });

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('ne redirige pas si le flag est absent mais déjà sur le segment onboarding (anti-boucle)', async () => {
    mockUseSegments.mockReturnValue(['onboarding']);
    mockUseAuth.mockReturnValue({ session: null, loading: false });
    mockUseOnboarding.mockReturnValue({
      completed: false,
      hydrated: true,
      completeOnboarding: jest.fn(),
    });

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockHideAsync).toHaveBeenCalledTimes(1);
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirige vers login si onboarding terminé, sur le segment onboarding, sans session', async () => {
    mockUseSegments.mockReturnValue(['onboarding']);
    mockUseAuth.mockReturnValue({ session: null, loading: false });
    mockUseOnboarding.mockReturnValue({
      completed: true,
      hydrated: true,
      completeOnboarding: jest.fn(),
    });

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  it('redirige vers les tabs si onboarding terminé, sur le segment onboarding, avec session', async () => {
    mockUseSegments.mockReturnValue(['onboarding']);
    mockUseAuth.mockReturnValue({ session: { access_token: 'token' }, loading: false });
    mockUseOnboarding.mockReturnValue({
      completed: true,
      hydrated: true,
      completeOnboarding: jest.fn(),
    });

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('ne redirige pas tant que hydrated est false', async () => {
    mockUseSegments.mockReturnValue(['(tabs)']);
    mockUseAuth.mockReturnValue({ session: null, loading: false });
    mockUseOnboarding.mockReturnValue({
      completed: false,
      hydrated: false,
      completeOnboarding: jest.fn(),
    });

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockHideAsync).toHaveBeenCalledTimes(1);
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
