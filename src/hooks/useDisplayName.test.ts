import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useDisplayName } from '@/hooks/useDisplayName';

const mockFetchMe = jest.fn();
const mockUpdateDisplayName = jest.fn();
const mockAuthState = {
  session: { access_token: 'mock-token', user: { id: 'user-1', is_anonymous: false } } as
    | { access_token: string; user: { id: string; is_anonymous: boolean } }
    | null,
  isAnonymous: false,
  profileRevision: 0,
};
const mockDevConfig = { DEBUG: false };

jest.mock('@/constants/devConfig', () => ({
  get DEBUG() { return mockDevConfig.DEBUG; },
}));

jest.mock('@/services/api/user', () => ({
  fetchMe: (...args: unknown[]) => mockFetchMe(...args),
  updateDisplayName: (...args: unknown[]) => mockUpdateDisplayName(...args),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchMe.mockReset();
  mockUpdateDisplayName.mockReset();
  mockAuthState.session = {
    access_token: 'mock-token',
    user: { id: 'user-1', is_anonymous: false },
  };
  mockAuthState.isAnonymous = false;
  mockAuthState.profileRevision = 0;
  mockDevConfig.DEBUG = false;
});

describe('useDisplayName', () => {
  it('trace le montage et le refresh manuel sans données personnelles', async () => {
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    mockDevConfig.DEBUG = true;
    mockFetchMe.mockResolvedValue({ display_name: 'Private name', email: 'private@example.com' });
    const { result } = renderHook(() => useDisplayName());
    await waitFor(() => expect(result.current.state.status).toBe('success'));
    await act(async () => { await result.current.refresh(); });

    expect(debugSpy.mock.calls.filter(([label]) => label === '[data-refresh]')).toEqual([
      ['[data-refresh]', { source: 'display-name', reason: 'mount-or-session', context: undefined }],
      ['[data-refresh]', { source: 'display-name', reason: 'manual', context: undefined }],
    ]);
    expect(JSON.stringify(debugSpy.mock.calls)).not.toMatch(/Private name|private@example.com|mock-token/);
    debugSpy.mockRestore();
  });

  it.each([false, true])('reprend une seule lecture différée avec le JWT courant après PATCH (échec=%s)', async (failSave) => {
    mockFetchMe.mockRejectedValueOnce(new Error('expired credential'));
    let settleSave!: (profile: { display_name: string }) => void;
    let rejectSave!: (error: Error) => void;
    mockUpdateDisplayName.mockReturnValueOnce(new Promise((resolve, reject) => {
      settleSave = resolve;
      rejectSave = reject;
    }));
    const { result, rerender } = renderHook(() => useDisplayName());
    await waitFor(() => expect(result.current.state.status).toBe('error'));

    let savePromise!: Promise<boolean>;
    act(() => { savePromise = result.current.save('Alexandre'); });
    mockAuthState.session = {
      access_token: 'renewed-token', user: { id: 'user-1', is_anonymous: false },
    };
    rerender(undefined);
    await act(async () => {
      await result.current.refresh();
      await result.current.refresh();
    });
    expect(mockFetchMe).toHaveBeenCalledTimes(1);
    expect(result.current.state.status).toBe('loading');

    mockFetchMe.mockResolvedValueOnce({ display_name: 'Server value' });
    await act(async () => {
      if (failSave) rejectSave(new Error('expired credential'));
      else settleSave({ display_name: 'Alexandre' });
      expect(await savePromise).toBe(!failSave);
    });

    await waitFor(() => expect(result.current.state).toEqual({ status: 'success', data: 'Server value' }));
    expect(mockFetchMe).toHaveBeenCalledTimes(2);
    expect(mockFetchMe).toHaveBeenLastCalledWith('renewed-token');
  });

  it('diffère le GET déclenché par le renouvellement du JWT pendant PATCH', async () => {
    mockFetchMe.mockResolvedValueOnce({ display_name: 'Alex' });
    let resolveSave!: (profile: { display_name: string }) => void;
    mockUpdateDisplayName.mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve; }));
    const { result, rerender } = renderHook(() => useDisplayName());
    await waitFor(() => expect(result.current.state.status).toBe('success'));
    let savePromise!: Promise<boolean>;
    act(() => { savePromise = result.current.save('Alexandre'); });
    mockAuthState.session = {
      access_token: 'renewed-token', user: { id: 'user-1', is_anonymous: false },
    };
    rerender(undefined);
    expect(mockFetchMe).toHaveBeenCalledTimes(1);
    mockFetchMe.mockResolvedValueOnce({ display_name: 'Alexandre' });
    await act(async () => {
      resolveSave({ display_name: 'Alexandre' });
      await savePromise;
    });

    await waitFor(() => expect(result.current.state).toEqual({ status: 'success', data: 'Alexandre' }));
    expect(mockFetchMe).toHaveBeenCalledTimes(2);
    expect(mockFetchMe).toHaveBeenLastCalledWith('renewed-token');
  });

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

    mockFetchMe.mockResolvedValue({ display_name: 'Alexandre' });
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
