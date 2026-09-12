import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useNewsletterConsent } from '@/hooks/useNewsletterConsent';

const mockFetchMe = jest.fn();
const mockUpdatePreferences = jest.fn();
const mockAuthState = {
  session: { access_token: 'mock-token', user: { id: 'user-1', is_anonymous: false } } as
    | { access_token: string; user: { id: string; is_anonymous: boolean } }
    | null,
  isAnonymous: false,
};
const mockDevConfigState = { MOCK_API: false, DEBUG: false };

jest.mock('@/services/api/user', () => ({
  fetchMe: (...args: unknown[]) => mockFetchMe(...args),
  updateUserPreferences: (...args: unknown[]) => mockUpdatePreferences(...args),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('@/constants/devConfig', () => ({
  get MOCK_API() { return mockDevConfigState.MOCK_API; },
  get DEBUG() { return mockDevConfigState.DEBUG; },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockDevConfigState.MOCK_API = false;
  mockAuthState.session = {
    access_token: 'mock-token',
    user: { id: 'user-1', is_anonymous: false },
  };
  mockAuthState.isAnonymous = false;
});

describe('useNewsletterConsent', () => {
  it('charge le consentement courant depuis /me', async () => {
    mockFetchMe.mockResolvedValueOnce({ newsletter_opt_in: true });
    const { result } = renderHook(() => useNewsletterConsent());

    await waitFor(() => expect(result.current.state.status).toBe('success'));
    expect(result.current.optedIn).toBe(true);
    expect(mockFetchMe).toHaveBeenCalledWith('mock-token');
  });

  it('reste idle pour une session anonyme et n\'appelle pas le réseau', async () => {
    mockAuthState.isAnonymous = true;
    const { result } = renderHook(() => useNewsletterConsent());

    await waitFor(() => expect(result.current.state.status).toBe('idle'));
    expect(mockFetchMe).not.toHaveBeenCalled();
  });

  it('bascule le consentement de façon optimiste et persiste via PATCH /preferences', async () => {
    mockFetchMe.mockResolvedValueOnce({ newsletter_opt_in: false });
    mockUpdatePreferences.mockResolvedValueOnce({});
    const { result } = renderHook(() => useNewsletterConsent());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => {
      await result.current.toggle();
    });

    expect(result.current.optedIn).toBe(true);
    expect(mockUpdatePreferences).toHaveBeenCalledWith('mock-token', true);
  });

  it('revient à l\'état précédent si le PATCH échoue', async () => {
    mockFetchMe.mockResolvedValueOnce({ newsletter_opt_in: true });
    mockUpdatePreferences.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useNewsletterConsent());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => {
      await result.current.toggle();
    });

    expect(result.current.optedIn).toBe(true);
  });

  it('expose une erreur si /me échoue', async () => {
    mockFetchMe.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useNewsletterConsent());

    await waitFor(() => expect(result.current.state.status).toBe('error'));
  });

  it('reste idle sans session et ignore un toggle prématuré', async () => {
    mockAuthState.session = null;
    const { result } = renderHook(() => useNewsletterConsent());
    await waitFor(() => expect(result.current.state.status).toBe('idle'));

    await act(async () => {
      await result.current.toggle();
    });

    expect(mockUpdatePreferences).not.toHaveBeenCalled();
    expect(result.current.optedIn).toBe(false);
  });

  it('en mode mock, bascule sans toucher au réseau', async () => {
    mockDevConfigState.MOCK_API = true;
    const { result } = renderHook(() => useNewsletterConsent());
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    await act(async () => {
      await result.current.toggle();
    });

    expect(result.current.optedIn).toBe(true);
    expect(mockFetchMe).not.toHaveBeenCalled();
    expect(mockUpdatePreferences).not.toHaveBeenCalled();
  });
});
