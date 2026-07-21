import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';

const asyncStorageStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(asyncStorageStore[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    asyncStorageStore[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete asyncStorageStore[key];
    return Promise.resolve();
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <OnboardingProvider>{children}</OnboardingProvider>
);

describe('OnboardingContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(asyncStorageStore).forEach((key) => delete asyncStorageStore[key]);
  });

  it('flag absent → completed=false après hydratation', async () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });
    expect(result.current.completed).toBe(false);
  });

  it('flag "true" en storage → completed=true', async () => {
    asyncStorageStore.onboarding_completed = 'true';

    const { result } = renderHook(() => useOnboarding(), { wrapper });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });
    expect(result.current.completed).toBe(true);
  });

  it('completeOnboarding persiste le flag et passe completed à true', async () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    await act(async () => {
      await result.current.completeOnboarding();
    });

    expect(result.current.completed).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('onboarding_completed', 'true');
  });

  it('resetOnboarding efface le flag et repasse completed à false', async () => {
    asyncStorageStore.onboarding_completed = 'true';

    const { result } = renderHook(() => useOnboarding(), { wrapper });

    await waitFor(() => {
      expect(result.current.completed).toBe(true);
    });

    await act(async () => {
      await result.current.resetOnboarding();
    });

    expect(result.current.completed).toBe(false);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('onboarding_completed');
    expect(asyncStorageStore.onboarding_completed).toBeUndefined();
  });

  it('erreur storage à l’hydratation → completed=false, pas de crash', async () => {
    const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockedAsyncStorage.getItem.mockRejectedValueOnce(new Error('storage unavailable'));

    const { result } = renderHook(() => useOnboarding(), { wrapper });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });
    expect(result.current.completed).toBe(false);
  });

  it('n’actualise pas le contexte après son démontage', async () => {
    let resolveStorage: (value: string | null) => void = () => {};
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(
      () => new Promise((resolve) => { resolveStorage = resolve; }),
    );
    const { unmount } = renderHook(() => useOnboarding(), { wrapper });

    unmount();
    await act(async () => { resolveStorage('true'); });
  });

  it('useOnboarding hors provider → throw', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useOnboarding())).toThrow(
      'useOnboarding must be used within OnboardingProvider',
    );
    consoleSpy.mockRestore();
  });
});
