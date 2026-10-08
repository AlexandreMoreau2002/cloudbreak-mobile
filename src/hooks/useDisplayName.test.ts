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
});
