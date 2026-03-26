import React from 'react';
import RootLayout from '@/app/_layout';
import { render, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockHideAsync = jest.fn();
const mockUseFonts = jest.fn();
const mockUseSegments = jest.fn();
const mockUseAuth = jest.fn();

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

jest.mock('@/contexts/SelectedPeakContext', () => ({
  SelectedPeakProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFonts.mockReturnValue([true]);
    mockUseSegments.mockReturnValue(['(tabs)']);
    mockUseAuth.mockReturnValue({ session: null, loading: false });
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
});
