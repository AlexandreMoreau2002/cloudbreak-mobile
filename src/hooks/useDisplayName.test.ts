import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useDisplayName } from '@/hooks/useDisplayName';

const mockFetchMe = jest.fn();
const mockUpdateDisplayName = jest.fn();
const mockAuthState = {
  session: { access_token: 'mock-token', user: { id: 'user-1', is_anonymous: false } } as
    | { access_token: string; user: { id: string; is_anonymous: boolean } }
    | null,
  isAnonymous: false,
};

jest.mock('@/services/api/user', () => ({
  fetchMe: (...args: unknown[]) => mockFetchMe(...args),
  updateDisplayName: (...args: unknown[]) => mockUpdateDisplayName(...args),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthState.session = {
    access_token: 'mock-token',
    user: { id: 'user-1', is_anonymous: false },
  };
  mockAuthState.isAnonymous = false;
});

describe('useDisplayName', () => {
  it('charge le nom courant pour une session permanente', async () => {
    mockFetchMe.mockResolvedValueOnce({ display_name: 'Alex' });
    const { result } = renderHook(() => useDisplayName());

    await waitFor(() => expect(result.current.state).toEqual({ status: 'success', data: 'Alex' }));
    expect(mockFetchMe).toHaveBeenCalledWith('mock-token');
  });

  it('sauvegarde le nom et affiche la valeur confirmée par le serveur', async () => {
    mockFetchMe.mockResolvedValueOnce({ display_name: 'Alex' });
    mockUpdateDisplayName.mockResolvedValueOnce({ display_name: 'Alexandre' });
    const { result } = renderHook(() => useDisplayName());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => { await result.current.save('Alexandre'); });

    expect(mockUpdateDisplayName).toHaveBeenCalledWith('mock-token', 'Alexandre');
    expect(result.current.state).toEqual({ status: 'success', data: 'Alexandre' });
  });

  it('efface le nom avec null', async () => {
    mockFetchMe.mockResolvedValueOnce({ display_name: 'Alex' });
    mockUpdateDisplayName.mockResolvedValueOnce({ display_name: null });
    const { result } = renderHook(() => useDisplayName());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => { await result.current.save(null); });

    expect(mockUpdateDisplayName).toHaveBeenCalledWith('mock-token', null);
    expect(result.current.state).toEqual({ status: 'success', data: null });
  });

  it('conserve le PATCH en cours quand le JWT du même compte est renouvelé', async () => {
    mockFetchMe.mockResolvedValue({ display_name: 'Alex' });
    let resolveSave!: (profile: { display_name: string }) => void;
    mockUpdateDisplayName.mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve; }));
    const { result, rerender } = renderHook(() => useDisplayName());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    let savePromise!: ReturnType<typeof result.current.save>;
    act(() => { savePromise = result.current.save('Alexandre'); });
    mockAuthState.session = {
      access_token: 'refreshed-token',
      user: { id: 'user-1', is_anonymous: false },
    };
    await act(async () => { rerender(undefined); });
    expect(result.current.state).toEqual({ status: 'loading', data: 'Alex' });

    await act(async () => {
      resolveSave({ display_name: 'Alexandre' });
      await savePromise;
    });
    expect(result.current.state).toEqual({ status: 'success', data: 'Alexandre' });
    mockFetchMe.mockResolvedValueOnce({ display_name: 'Alexandre' });
    await act(async () => { await result.current.refresh(); });
    expect(mockFetchMe).toHaveBeenLastCalledWith('refreshed-token');
  });

  it('reste idle et évite le réseau pour une session anonyme ou absente', async () => {
    mockAuthState.isAnonymous = true;
    const { result, rerender } = renderHook(() => useDisplayName());
    await act(async () => { await result.current.save('Alex'); await result.current.refresh(); });
    expect(result.current.state).toEqual({ status: 'idle' });

    mockAuthState.isAnonymous = false;
    mockAuthState.session = null;
    rerender(undefined);
    await act(async () => { await result.current.save('Alex'); await result.current.refresh(); });
    expect(result.current.state).toEqual({ status: 'idle' });
    expect(mockFetchMe).not.toHaveBeenCalled();
    expect(mockUpdateDisplayName).not.toHaveBeenCalled();
  });

  it('garde la dernière valeur confirmée et expose l’erreur si le PATCH échoue', async () => {
    mockFetchMe.mockResolvedValueOnce({ display_name: 'Alex' });
    mockUpdateDisplayName.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useDisplayName());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => { await result.current.save('Alexandre'); });

    expect(result.current.state).toEqual({ status: 'error', data: 'Alex', error: 'network' });
  });

  it('efface le nom à la déconnexion et ignore une sauvegarde ancienne', async () => {
    mockFetchMe.mockResolvedValueOnce({ display_name: 'Alex' });
    let resolveSave!: (profile: { display_name: string }) => void;
    mockUpdateDisplayName.mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve; }));
    const { result, rerender } = renderHook(() => useDisplayName());
    await waitFor(() => expect(result.current.state).toEqual({ status: 'success', data: 'Alex' }));

    let savePromise!: Promise<boolean>;
    act(() => { savePromise = result.current.save('Alexandre'); });
    mockAuthState.isAnonymous = true;
    mockAuthState.session = null;
    rerender(undefined);
    expect(result.current.state).toEqual({ status: 'idle' });

    await act(async () => {
      resolveSave({ display_name: 'Alexandre' });
      await savePromise;
    });
    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('ne montre pas le nom de A à B et ignore un ancien chargement de A', async () => {
    mockFetchMe.mockResolvedValueOnce({ display_name: 'Alice' });
    let resolveA!: (me: { display_name: string }) => void;
    let resolveB!: (me: { display_name: string }) => void;
    mockFetchMe.mockReturnValueOnce(new Promise((resolve) => { resolveA = resolve; }));
    mockFetchMe.mockReturnValueOnce(new Promise((resolve) => { resolveB = resolve; }));
    const { result, rerender } = renderHook(() => useDisplayName());
    await waitFor(() => expect(result.current.state).toEqual({ status: 'success', data: 'Alice' }));

    let refreshA!: Promise<void>;
    act(() => { refreshA = result.current.refresh(); });
    mockAuthState.session = {
      access_token: 'token-b',
      user: { id: 'user-b', is_anonymous: false },
    };
    rerender(undefined);
    expect(result.current.state.data).toBeUndefined();
    expect(mockFetchMe).toHaveBeenLastCalledWith('token-b');

    await act(async () => { resolveB({ display_name: 'Bob' }); });
    expect(result.current.state).toEqual({ status: 'success', data: 'Bob' });
    await act(async () => {
      resolveA({ display_name: 'Alice stale' });
      await refreshA;
    });
    expect(result.current.state).toEqual({ status: 'success', data: 'Bob' });
  });
});
