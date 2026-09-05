import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import {
  AccountGateProvider,
  useAccountGate,
  type PendingAction,
} from '@/contexts/AccountGateContext';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockAddFavorite = jest.fn();
const mockGetSession = jest.fn();
const mockAuthState = {
  session: { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } },
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush, replace: mockReplace }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('@/services/api/user', () => ({
  addFavorite: (...args: unknown[]) => mockAddFavorite(...args),
}));

jest.mock('@/services/supabaseClient', () => ({
  supabase: { auth: { getSession: (...args: unknown[]) => mockGetSession(...args) } },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const wrapper = ({ children }: { children: ReactNode }) => (
  <AccountGateProvider>{children}</AccountGateProvider>
);

describe('AccountGateContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.session = {
      access_token: 'guest-token',
      user: { id: 'guest', is_anonymous: true },
    };
    mockGetSession.mockResolvedValue({ data: { session: mockAuthState.session } });
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it('mémorise le favori invité et ouvre la page compte générique', () => {
    const { result } = renderHook(() => useAccountGate(), { wrapper });

    act(() => result.current.requireAccount({ kind: 'favorite', peakId: 'peak-42' }));

    expect(result.current.pendingAction).toEqual({ kind: 'favorite', peakId: 'peak-42' });
    expect(mockPush).toHaveBeenCalledWith('/account');
  });

  it('conserve les identifiants d’upgrade en mémoire pendant le parcours', async () => {
    const { result } = renderHook(() => useAccountGate(), { wrapper });

    expect(result.current.emailUpgradeCredentials).toBeNull();
    act(() => result.current.setEmailUpgradeCredentials({ email: 'alex@example.com', password: 'secret' }));
    expect(result.current.emailUpgradeCredentials).toEqual({ email: 'alex@example.com', password: 'secret' });

    await act(async () => result.current.cancelAccountFlow());
    expect(result.current.emailUpgradeCredentials).toBeNull();
  });

  it('nettoie les identifiants après finalisation du parcours', async () => {
    const { result } = renderHook(() => useAccountGate(), { wrapper });
    act(() => {
      result.current.setEmailUpgradeCredentials({ email: 'alex@example.com', password: 'secret' });
      result.current.requireAccount({ kind: 'first_run' });
    });

    await act(async () => result.current.finishAccountCreation());
    expect(result.current.emailUpgradeCredentials).toBeNull();
  });

  it('rejoue le favori avec la session permanente puis revient à l’écran d’origine', async () => {
    const { result, rerender } = renderHook(() => useAccountGate(), { wrapper });
    act(() => result.current.requireAccount({ kind: 'favorite', peakId: 'peak-42' }));
    mockAuthState.session = {
      access_token: 'permanent-token',
      user: { id: 'account', is_anonymous: false },
    };
    mockGetSession.mockResolvedValue({ data: { session: mockAuthState.session } });
    rerender(undefined);

    await act(async () => result.current.finishAccountCreation());

    expect(mockAddFavorite).toHaveBeenCalledWith('permanent-token', 'peak-42');
    expect(result.current.pendingAction).toBeNull();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('relit la session Supabase fraîche avant de rejouer un favori après conversion', async () => {
    const { result } = renderHook(() => useAccountGate(), { wrapper });
    act(() => result.current.requireAccount({ kind: 'favorite', peakId: 'peak-fresh' }));
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'fresh-token', user: { id: 'account', is_anonymous: false } } },
    });

    await act(async () => result.current.finishAccountCreation());

    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(mockAddFavorite).toHaveBeenCalledTimes(1);
    expect(mockAddFavorite).toHaveBeenCalledWith('fresh-token', 'peak-fresh');
  });

  it('ne rejoue pas le favori sans session permanente fraîche', async () => {
    const { result } = renderHook(() => useAccountGate(), { wrapper });
    act(() => result.current.requireAccount({ kind: 'favorite', peakId: 'peak-anonymous' }));
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await act(async () => result.current.finishAccountCreation());

    expect(mockAddFavorite).not.toHaveBeenCalled();
  });

  it('rejoue le callback de quota après conversion', async () => {
    const retry = jest.fn().mockResolvedValue(undefined);
    const action: PendingAction = { kind: 'quota', retry };
    const { result } = renderHook(() => useAccountGate(), { wrapper });
    act(() => result.current.requireAccount(action));
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'fresh-token', user: { id: 'account', is_anonymous: false } } },
    });

    await act(async () => result.current.finishAccountCreation());

    expect(retry).toHaveBeenCalledTimes(1);
    expect(result.current.pendingAction).toBeNull();
  });

  it('ne rejoue pas le quota sans session permanente fraîche', async () => {
    const retry = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAccountGate(), { wrapper });
    act(() => result.current.requireAccount({ kind: 'quota', retry }));
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } } },
    });

    await act(async () => result.current.finishAccountCreation());

    expect(retry).not.toHaveBeenCalled();
  });

  it('annule le parcours sans rejouer l’action et conserve la session invitée', async () => {
    const retry = jest.fn();
    const { result } = renderHook(() => useAccountGate(), { wrapper });
    act(() => result.current.requireAccount({ kind: 'quota', retry }));

    await act(async () => result.current.cancelAccountFlow());

    expect(retry).not.toHaveBeenCalled();
    expect(result.current.pendingAction).toBeNull();
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('ouvre la variante first-run et enregistre Explorer d’abord avant la Home', async () => {
    const { result } = renderHook(() => useAccountGate(), { wrapper });
    act(() => result.current.requireAccount({ kind: 'first_run' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/account',
      params: { firstRun: '1' },
    });

    await act(async () => result.current.cancelAccountFlow());

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('hasSeenAccountPrompt', 'true');
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('marque aussi le prompt first-run comme vu après création du compte', async () => {
    const { result } = renderHook(() => useAccountGate(), { wrapper });
    act(() => result.current.requireAccount({ kind: 'first_run' }));

    await act(async () => result.current.finishAccountCreation());

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('hasSeenAccountPrompt', 'true');
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('déclenche le prompt first-run une seule fois pour une session invitée non vue', async () => {
    const { result } = renderHook(() => useAccountGate(), { wrapper });

    await act(async () => result.current.maybePromptFirstRun());
    await act(async () => result.current.maybePromptFirstRun());

    expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('hasSeenAccountPrompt');
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(result.current.pendingAction).toEqual({ kind: 'first_run' });
  });

  it('ne déclenche pas le prompt si le flag est déjà vu ou si le compte est permanent', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('true');
    const { result, rerender } = renderHook(() => useAccountGate(), { wrapper });

    await act(async () => result.current.maybePromptFirstRun());
    expect(mockPush).not.toHaveBeenCalled();

    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAuthState.session = {
      access_token: 'permanent-token',
      user: { id: 'account', is_anonymous: false },
    };
    rerender(undefined);
    await act(async () => result.current.maybePromptFirstRun());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('échoue explicitement hors provider', () => {
    expect(() => renderHook(() => useAccountGate())).toThrow(
      'useAccountGate must be used within AccountGateProvider',
    );
  });
});
