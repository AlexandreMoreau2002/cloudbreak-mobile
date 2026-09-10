import React from 'react';
import { AuthError } from '@supabase/supabase-js';
import { Text, TouchableOpacity, Platform } from 'react-native';
import { act, render, waitFor, fireEvent } from '@testing-library/react-native';
import { AuthProvider, isRateLimitError, useAuth } from '@/contexts/AuthContext';
import { deleteAccount, provisionUser, updateUserSurvey } from '@/services/api/user';

const mockUnsubscribe = jest.fn();
const mockGetSession = jest.fn().mockResolvedValue({ data: { session: null } });
const mockGetUser = jest.fn().mockResolvedValue({ data: { user: { id: 'validated-user' } }, error: null });
const mockOnAuthStateChange = jest.fn().mockReturnValue({
  data: { subscription: { unsubscribe: mockUnsubscribe } },
});
const mockSignOut = jest.fn().mockResolvedValue(undefined);
const mockSignIn = jest.fn().mockResolvedValue({ error: null });
const mockSignUp = jest.fn().mockResolvedValue({ error: null });
const mockResend = jest.fn().mockResolvedValue({ error: null });
const mockUpdateUser = jest.fn().mockResolvedValue({ error: null });
const mockVerifyOtp = jest.fn().mockResolvedValue({ error: null });
const mockResetPasswordForEmail = jest.fn().mockResolvedValue({ error: null });
const mockLinkIdentity = jest.fn().mockResolvedValue({ error: null });
const mockSignInAnonymously = jest.fn().mockResolvedValue({ error: null });
const mockSignInWithIdToken = jest.fn().mockResolvedValue({ error: null });
const mockAppleSignInAsync = jest.fn().mockResolvedValue({ identityToken: 'apple-id-token' });
const mockGetRandomBytesAsync = jest.fn().mockResolvedValue(Uint8Array.from([0, 1, 2, 255]));
const mockDigestStringAsync = jest.fn().mockResolvedValue('hashed-apple-nonce');
const mockAsyncStorageClear = jest.fn().mockResolvedValue(undefined);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: (...args: unknown[]) => mockGetRandomBytesAsync(...args),
  digestStringAsync: (...args: unknown[]) => mockDigestStringAsync(...args),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { HEX: 'hex' },
}));

jest.mock('expo-apple-authentication', () => ({
  signInAsync: (...args: unknown[]) => mockAppleSignInAsync(...args),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}), { virtual: true });

jest.mock('@react-native-async-storage/async-storage', () => ({
  get clear() { return mockAsyncStorageClear; },
  get default() { return { clear: mockAsyncStorageClear }; },
}));

jest.mock('@/services/api/user', () => ({
  deleteAccount: jest.fn().mockResolvedValue(undefined),
  provisionUser: jest.fn().mockResolvedValue({}),
  updateUserSurvey: jest.fn().mockResolvedValue({}),
}));

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
}));

const mockDeleteAccount = deleteAccount as jest.MockedFunction<typeof deleteAccount>;
const mockProvisionUser = provisionUser as jest.MockedFunction<typeof provisionUser>;
const mockUpdateUserSurvey = updateUserSurvey as jest.MockedFunction<typeof updateUserSurvey>;

jest.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: {
      get signUp() { return mockSignUp; },
      get resend() { return mockResend; },
      get signOut() { return mockSignOut; },
      get updateUser() { return mockUpdateUser; },
      get verifyOtp() { return mockVerifyOtp; },
      get getSession() { return mockGetSession; },
      get getUser() { return mockGetUser; },
      get linkIdentity() { return mockLinkIdentity; },
      get resetPasswordForEmail() { return mockResetPasswordForEmail; },
      get signInAnonymously() { return mockSignInAnonymously; },
      get signInWithPassword() { return mockSignIn; },
      get signInWithIdToken() { return mockSignInWithIdToken; },
      get onAuthStateChange() { return mockOnAuthStateChange; },
    },
  },
}));

let currentAuth: ReturnType<typeof useAuth> | null = null;

function getAuth(): ReturnType<typeof useAuth> {
  if (!currentAuth) throw new Error('AuthContext not rendered');
  return currentAuth;
}

function TestConsumer() {
  currentAuth = useAuth();
  const {
    session, loading, signIn, signUp, signOut,
    deleteAccount: deleteUserAccount,
    locationPermission, setLocationPermission, refreshLocationPermission,
  } = currentAuth;
  return (
    <>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="session">{session ? 'connected' : 'disconnected'}</Text>
      <Text testID="isAnonymous">{String(currentAuth.isAnonymous)}</Text>
      <Text testID="locationPermission">{locationPermission}</Text>
      <TouchableOpacity testID="signIn" onPress={() => signIn('a@b.com', 'pass')} />
      <TouchableOpacity testID="signUp" onPress={() => signUp('a@b.com', 'pass')} />
      <TouchableOpacity testID="signOut" onPress={() => signOut()} />
      <TouchableOpacity testID="deleteAccount" onPress={() => deleteUserAccount()} />
      <TouchableOpacity testID="setGranted" onPress={() => setLocationPermission('granted')} />
      <TouchableOpacity testID="refresh" onPress={() => refreshLocationPermission()} />
    </>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    currentAuth = null;
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'validated-user' } }, error: null });
    mockSignOut.mockResolvedValue(undefined);
    mockSignIn.mockResolvedValue({ error: null });
    mockSignUp.mockResolvedValue({ error: null });
    mockResend.mockResolvedValue({ error: null });
    mockUpdateUser.mockReset();
    mockUpdateUser.mockResolvedValue({ error: null });
    mockVerifyOtp.mockResolvedValue({ error: null });
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    mockLinkIdentity.mockResolvedValue({ error: null });
    mockSignInAnonymously.mockResolvedValue({ error: null });
    mockSignInWithIdToken.mockResolvedValue({ error: null });
    mockAppleSignInAsync.mockResolvedValue({ identityToken: 'apple-id-token' });
    mockGetRandomBytesAsync.mockResolvedValue(Uint8Array.from([0, 1, 2, 255]));
    mockDigestStringAsync.mockResolvedValue('hashed-apple-nonce');
    mockDeleteAccount.mockResolvedValue(undefined);
    mockProvisionUser.mockResolvedValue({} as never);
    mockUpdateUserSurvey.mockResolvedValue({} as never);
    mockAsyncStorageClear.mockResolvedValue(undefined);
    jest.requireMock('expo-location').getForegroundPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('démarre en état loading puis résout sans session', async () => {
    const { getByTestId } = render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );
    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getByTestId('session').props.children).toBe('disconnected');
    });
  });

  it("gère l'erreur getSession sans bloquer le loading", async () => {
    mockGetSession.mockRejectedValueOnce(new Error('network error'));
    const { getByTestId } = render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );
    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getByTestId('session').props.children).toBe('disconnected');
    });
  });

  it('conserve une session persistée après validation distante réussie', async () => {
    const storedSession = {
      access_token: 'stored-permanent-token',
      user: { id: 'permanent-user', is_anonymous: false },
    };
    mockGetSession.mockResolvedValueOnce({ data: { session: storedSession } });
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'permanent-user', is_anonymous: false } },
      error: null,
    });

    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getByTestId('session').props.children).toBe('connected');
    });
    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('efface localement une session persistée invalidée par Supabase', async () => {
    const storedSession = {
      access_token: 'stored-permanent-token',
      user: { id: 'deleted-user', is_anonymous: false },
    };
    mockGetSession.mockResolvedValueOnce({ data: { session: storedSession } });
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: new AuthError('User not found'),
    });

    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getByTestId('session').props.children).toBe('disconnected');
    });
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('valide le snapshot persisté malgré INITIAL_SESSION avant de le déconnecter localement', async () => {
    const storedSession = {
      access_token: 'stored-permanent-token',
      user: { id: 'deleted-user', is_anonymous: false },
    };
    mockGetSession.mockResolvedValueOnce({ data: { session: storedSession } });
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: new AuthError('User not found'),
    });
    mockOnAuthStateChange.mockImplementationOnce((callback: Function) => {
      callback('INITIAL_SESSION', storedSession);
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });

    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getByTestId('session').props.children).toBe('disconnected');
    });
    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('conserve une session persistée quand sa validation distante échoue par réseau', async () => {
    const storedSession = {
      access_token: 'stored-permanent-token',
      user: { id: 'offline-user', is_anonymous: false },
    };
    mockGetSession.mockResolvedValueOnce({ data: { session: storedSession } });
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: new AuthError('Network request failed'),
    });

    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getByTestId('session').props.children).toBe('connected');
      expect(getAuth().authServiceUnavailable).toBe(true);
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('conserve la session persistée quand getUser rejette par une erreur réseau', async () => {
    const storedSession = {
      access_token: 'stored-permanent-token',
      user: { id: 'offline-user', is_anonymous: false },
    };
    mockGetSession.mockResolvedValueOnce({ data: { session: storedSession } });
    mockGetUser.mockRejectedValueOnce(new Error('failed to fetch'));

    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getByTestId('session').props.children).toBe('connected');
      expect(getAuth().authServiceUnavailable).toBe(true);
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('conserve la session persistée quand getUser rejette par une erreur SDK ambiguë', async () => {
    const storedSession = {
      access_token: 'stored-permanent-token',
      user: { id: 'temporarily-unavailable-user', is_anonymous: false },
    };
    mockGetSession.mockResolvedValueOnce({ data: { session: storedSession } });
    mockGetUser.mockRejectedValueOnce(new Error('Unexpected SDK failure'));

    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getByTestId('session').props.children).toBe('connected');
      expect(getAuth().authServiceUnavailable).toBe(true);
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it.each([
    ['rate limit Supabase', new AuthError('Too many requests', 429)],
    ['erreur serveur Supabase', new AuthError('Internal server error', 500)],
  ])('conserve une session persistée lors d’une %s', async (_label, error) => {
    const storedSession = {
      access_token: 'stored-permanent-token',
      user: { id: 'temporarily-unavailable-user', is_anonymous: false },
    };
    mockGetSession.mockResolvedValueOnce({ data: { session: storedSession } });
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error });

    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getByTestId('session').props.children).toBe('connected');
      expect(getAuth().authServiceUnavailable).toBe(true);
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('laisse un événement de session fraîche gagner sur une validation bootstrap réussie', async () => {
    const getUserDeferred = deferred<{ data: { user: { id: string } }; error: null }>();
    const storedSession = {
      access_token: 'stored-permanent-token',
      user: { id: 'stored-user', is_anonymous: false },
    };
    const freshSession = {
      access_token: 'fresh-permanent-token',
      user: { id: 'fresh-user', is_anonymous: false },
    };
    let onAuthStateChange: ((event: string, nextSession: typeof freshSession) => void) | null = null;
    mockGetSession.mockResolvedValueOnce({ data: { session: storedSession } });
    mockGetUser.mockImplementationOnce(() => getUserDeferred.promise);
    mockOnAuthStateChange.mockImplementationOnce((callback: typeof onAuthStateChange) => {
      onAuthStateChange = callback;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });

    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(mockGetUser).toHaveBeenCalledTimes(1));

    await act(async () => {
      onAuthStateChange?.('TOKEN_REFRESHED', freshSession);
    });
    await act(async () => {
      getUserDeferred.resolve({ data: { user: { id: 'stored-user' } }, error: null });
      await getUserDeferred.promise;
    });

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getAuth().session?.user.id).toBe('fresh-user');
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('laisse un événement de session fraîche gagner sur une validation bootstrap invalide', async () => {
    const getUserDeferred = deferred<{ data: { user: null }; error: AuthError }>();
    const storedSession = {
      access_token: 'stored-permanent-token',
      user: { id: 'stored-user', is_anonymous: false },
    };
    const freshSession = {
      access_token: 'fresh-permanent-token',
      user: { id: 'fresh-user', is_anonymous: false },
    };
    let onAuthStateChange: ((event: string, nextSession: typeof freshSession) => void) | null = null;
    mockGetSession.mockResolvedValueOnce({ data: { session: storedSession } });
    mockGetUser.mockImplementationOnce(() => getUserDeferred.promise);
    mockOnAuthStateChange.mockImplementationOnce((callback: typeof onAuthStateChange) => {
      onAuthStateChange = callback;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });

    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(mockGetUser).toHaveBeenCalledTimes(1));

    await act(async () => {
      onAuthStateChange?.('SIGNED_IN', freshSession);
    });
    await act(async () => {
      getUserDeferred.resolve({ data: { user: null }, error: new AuthError('User not found') });
      await getUserDeferred.promise;
    });

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getAuth().session?.user.id).toBe('fresh-user');
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('n’écrit plus dans l’état ni ne déconnecte après un unmount pendant getUser', async () => {
    const getUserDeferred = deferred<{ data: { user: null }; error: AuthError }>();
    const storedSession = {
      access_token: 'stored-permanent-token',
      user: { id: 'stored-user', is_anonymous: false },
    };
    mockGetSession.mockResolvedValueOnce({ data: { session: storedSession } });
    mockGetUser.mockImplementationOnce(() => getUserDeferred.promise);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(mockGetUser).toHaveBeenCalledTimes(1));
    unmount();

    await act(async () => {
      getUserDeferred.resolve({ data: { user: null }, error: new AuthError('User not found') });
      await getUserDeferred.promise;
    });

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('onAuthStateChange met à jour la session', async () => {
    const fakeSession = { user: { id: '123' } };
    mockOnAuthStateChange.mockImplementationOnce((cb: Function) => {
      cb('SIGNED_IN', fakeSession);
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    const { getByTestId } = render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );
    await waitFor(() => {
      expect(getByTestId('session').props.children).toBe('connected');
    });
  });

  it('se désabonne au unmount', async () => {
    const { unmount } = render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );
    await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalled());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('signIn appelle supabase.auth.signInWithPassword', async () => {
    const { getByTestId } = render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));
    fireEvent.press(getByTestId('signIn'));
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass' });
  });

  it('provisionne une session permanente après signIn réussi', async () => {
    const permanentSession = {
      access_token: 'permanent-token', user: { id: 'u1', is_anonymous: false },
    };
    mockSignIn.mockResolvedValueOnce({ data: { session: permanentSession }, error: null });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => { await getAuth().signIn('a@b.com', 'pass'); });

    expect(mockProvisionUser).toHaveBeenCalledWith('permanent-token');
  });

  it('ne masque pas un échec réseau du provisioning après signIn', async () => {
    const permanentSession = {
      access_token: 'permanent-token', user: { id: 'u1', is_anonymous: false },
    };
    mockSignIn.mockResolvedValueOnce({ data: { session: permanentSession }, error: null });
    mockProvisionUser.mockRejectedValueOnce(new Error('network request failed'));
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => { error = await getAuth().signIn('a@b.com', 'pass'); });

    expect(error).toBeInstanceOf(AuthError);
    expect(getAuth().isAnonymous).toBe(false);
    expect(getAuth().authServiceUnavailable).toBe(true);
  });

  it('signUp appelle supabase.auth.signUp', async () => {
    const { getByTestId } = render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));
    fireEvent.press(getByTestId('signUp'));
    expect(mockSignUp).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass' });
  });

  it('signOut appelle supabase.auth.signOut', async () => {
    const { getByTestId } = render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));
    fireEvent.press(getByTestId('signOut'));
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('signOut ignore les erreurs supabase.auth.signOut', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('network down'));

    function TestSignOutError() {
      const [done, setDone] = React.useState(false);
      const { signOut } = useAuth();
      return (
        <>
          <Text testID="done">{String(done)}</Text>
          <TouchableOpacity
            testID="signOut"
            onPress={async () => {
              await signOut();
              setDone(true);
            }}
          />
        </>
      );
    }

    const { getByTestId } = render(
      <AuthProvider><TestSignOutError /></AuthProvider>
    );
    fireEvent.press(getByTestId('signOut'));

    await waitFor(() => expect(getByTestId('done').props.children).toBe('true'));
  });

  it('deleteAccount rejette quand aucune session authentifiée n\'existe', async () => {
    function TestDeleteWithoutSession() {
      const [error, setError] = React.useState('');
      const { deleteAccount: deleteUserAccount } = useAuth();
      return (
        <>
          <Text testID="error">{error}</Text>
          <TouchableOpacity
            testID="deleteAccount"
            onPress={async () => {
              try {
                await deleteUserAccount();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'unknown');
              }
            }}
          />
        </>
      );
    }

    const { getByTestId } = render(
      <AuthProvider><TestDeleteWithoutSession /></AuthProvider>
    );

    await waitFor(() => expect(mockGetSession).toHaveBeenCalledTimes(1));
    fireEvent.press(getByTestId('deleteAccount'));

    await waitFor(() => expect(getByTestId('error').props.children).toBe('Non authentifié'));
    expect(mockDeleteAccount).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockAsyncStorageClear).not.toHaveBeenCalled();
  });

  it('deleteAccount supprime le compte, déconnecte puis vide le stockage local', async () => {
    const fakeSession = {
      access_token: 'token-123',
      user: { id: '123' },
    };
    mockGetSession.mockResolvedValueOnce({ data: { session: fakeSession } });

    const { getByTestId } = render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await waitFor(() => expect(getByTestId('session').props.children).toBe('connected'));
    fireEvent.press(getByTestId('deleteAccount'));

    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledWith('token-123'));
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mockAsyncStorageClear).toHaveBeenCalledTimes(1);
  });

  it('deleteAccount vide le stockage local même si signOut rejette', async () => {
    const fakeSession = {
      access_token: 'token-123',
      user: { id: '123' },
    };
    mockGetSession.mockResolvedValueOnce({ data: { session: fakeSession } });
    mockSignOut.mockRejectedValueOnce(new Error('network down'));

    const { getByTestId } = render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await waitFor(() => expect(getByTestId('session').props.children).toBe('connected'));
    fireEvent.press(getByTestId('deleteAccount'));

    await waitFor(() => expect(mockAsyncStorageClear).toHaveBeenCalledTimes(1));
    expect(mockDeleteAccount).toHaveBeenCalledWith('token-123');
  });

  it('useAuth lance une erreur hors AuthProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within AuthProvider');
    consoleError.mockRestore();
  });

  it('signUp active authServiceUnavailable quand supabase.auth.signUp throw', async () => {
    mockSignUp.mockRejectedValueOnce(new Error('network down'));

    function TestUnavailable() {
      const { authServiceUnavailable, signUp } = useAuth();
      return (
        <>
          <Text testID="unavailable">{String(authServiceUnavailable)}</Text>
          <TouchableOpacity testID="signUp" onPress={() => signUp('a@b.com', 'pass')} />
        </>
      );
    }

    const { getByTestId } = render(
      <AuthProvider><TestUnavailable /></AuthProvider>
    );
    await waitFor(() => expect(getByTestId('unavailable').props.children).toBe('false'));
    fireEvent.press(getByTestId('signUp'));
    await waitFor(() => expect(getByTestId('unavailable').props.children).toBe('true'));
  });

  it('signIn active authServiceUnavailable quand supabase.auth.signInWithPassword throw', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('network down'));

    function TestUnavailable() {
      const { authServiceUnavailable, signIn } = useAuth();
      return (
        <>
          <Text testID="unavailable">{String(authServiceUnavailable)}</Text>
          <TouchableOpacity testID="signIn" onPress={() => signIn('a@b.com', 'pass')} />
        </>
      );
    }

    const { getByTestId } = render(
      <AuthProvider><TestUnavailable /></AuthProvider>
    );
    await waitFor(() => expect(getByTestId('unavailable').props.children).toBe('false'));
    fireEvent.press(getByTestId('signIn'));
    await waitFor(() => expect(getByTestId('unavailable').props.children).toBe('true'));
  });

  it('getSession rejeté avec erreur réseau active authServiceUnavailable', async () => {
    mockGetSession.mockRejectedValueOnce(new Error('network request failed'));

    function TestUnavailable() {
      const { authServiceUnavailable } = useAuth();
      return <Text testID="unavailable">{String(authServiceUnavailable)}</Text>;
    }

    const { getByTestId } = render(
      <AuthProvider><TestUnavailable /></AuthProvider>
    );
    await waitFor(() => expect(getByTestId('unavailable').props.children).toBe('true'));
  });

  it('getSession rejeté avec valeur non-Error ne plante pas', async () => {
    mockGetSession.mockRejectedValueOnce('plain string error');

    function TestUnavailable() {
      const { authServiceUnavailable, loading } = useAuth();
      return (
        <>
          <Text testID="loading">{String(loading)}</Text>
          <Text testID="unavailable">{String(authServiceUnavailable)}</Text>
        </>
      );
    }

    const { getByTestId } = render(
      <AuthProvider><TestUnavailable /></AuthProvider>
    );
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));
    expect(getByTestId('unavailable').props.children).toBe('false');
  });

  it('signUp avec erreur réseau retournée active authServiceUnavailable', async () => {
    const networkError = Object.assign(new Error('network request failed'), { status: 0 });
    mockSignUp.mockResolvedValueOnce({ error: networkError });

    function TestUnavailable() {
      const { authServiceUnavailable, signUp } = useAuth();
      return (
        <>
          <Text testID="unavailable">{String(authServiceUnavailable)}</Text>
          <TouchableOpacity testID="signUp" onPress={() => signUp('a@b.com', 'pass')} />
        </>
      );
    }

    const { getByTestId } = render(
      <AuthProvider><TestUnavailable /></AuthProvider>
    );
    await waitFor(() => expect(getByTestId('unavailable').props.children).toBe('false'));
    fireEvent.press(getByTestId('signUp'));
    await waitFor(() => expect(getByTestId('unavailable').props.children).toBe('true'));
  });

  it('signIn avec erreur réseau retournée active authServiceUnavailable', async () => {
    const networkError = Object.assign(new Error('failed to fetch'), { status: 0 });
    mockSignIn.mockResolvedValueOnce({ error: networkError });

    function TestUnavailable() {
      const { authServiceUnavailable, signIn } = useAuth();
      return (
        <>
          <Text testID="unavailable">{String(authServiceUnavailable)}</Text>
          <TouchableOpacity testID="signIn" onPress={() => signIn('a@b.com', 'pass')} />
        </>
      );
    }

    const { getByTestId } = render(
      <AuthProvider><TestUnavailable /></AuthProvider>
    );
    await waitFor(() => expect(getByTestId('unavailable').props.children).toBe('false'));
    fireEvent.press(getByTestId('signIn'));
    await waitFor(() => expect(getByTestId('unavailable').props.children).toBe('true'));
  });

  it('starts with locationPermission undetermined and refreshes it from the OS on mount', async () => {
    const Location = jest.requireMock('expo-location');
    Location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });

    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    expect(getByTestId('locationPermission').props.children).toBe('undetermined');

    await waitFor(() => {
      expect(getByTestId('locationPermission').props.children).toBe('granted');
    });
  });

  it('setLocationPermission updates the state directly', async () => {
    const Location = jest.requireMock('expo-location');
    Location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => {
      expect(getByTestId('locationPermission').props.children).toBe('denied');
    });

    fireEvent.press(getByTestId('setGranted'));
    expect(getByTestId('locationPermission').props.children).toBe('granted');
  });

  it('refreshLocationPermission re-reads the OS status on demand', async () => {
    const Location = jest.requireMock('expo-location');
    Location.getForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' });

    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => {
      expect(getByTestId('locationPermission').props.children).toBe('undetermined');
    });

    Location.getForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    fireEvent.press(getByTestId('refresh'));

    await waitFor(() => {
      expect(getByTestId('locationPermission').props.children).toBe('granted');
    });
  });

  it('crée une session anonyme quand aucune session ne subsiste', async () => {
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().ensureAnonymousSession();
    });

    expect(error).toBeNull();
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('partage la création de session anonyme entre appels concurrents', async () => {
    let resolveSignIn: ((value: { error: null }) => void) | undefined;
    mockSignInAnonymously.mockImplementationOnce(
      () => new Promise((resolve) => { resolveSignIn = resolve; }),
    );
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let first: Promise<AuthError | null>;
    let second: Promise<AuthError | null>;
    await act(async () => {
      first = getAuth().ensureAnonymousSession();
      second = getAuth().ensureAnonymousSession();
      expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
      resolveSignIn?.({ error: null });
      await expect(Promise.all([first, second])).resolves.toEqual([null, null]);
    });

    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);

    await act(async () => {
      await expect(getAuth().ensureAnonymousSession()).resolves.toBeNull();
    });
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(2);
  });

  it('partage la création anonyme entre ensure et signOutToAnonymous concurrents', async () => {
    let resolveSignIn: ((value: { error: null }) => void) | undefined;
    let resolveSignOut: (() => void) | undefined;
    const permanentSession = {
      access_token: 'permanent-token', user: { id: 'user', is_anonymous: false },
    };
    const guestSession = { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } };
    mockSignInAnonymously.mockImplementationOnce(
      () => new Promise((resolve) => { resolveSignIn = resolve; }),
    );
    mockSignOut.mockImplementationOnce(() => new Promise<void>((resolve) => { resolveSignOut = resolve; }));
    mockGetSession.mockResolvedValueOnce({ data: { session: permanentSession } });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));
    mockGetSession.mockResolvedValue({ data: { session: guestSession } });

    let signOutPromise: Promise<AuthError | null>;
    await act(async () => {
      signOutPromise = getAuth().signOutToAnonymous();
      resolveSignOut?.();
      await Promise.resolve();
    });
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockSignInAnonymously).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getByTestId('isAnonymous').props.children).toBe('false'));
    expect(getAuth().session).toBeNull();
    let ensurePromise: Promise<AuthError | null>;
    await act(async () => {
      ensurePromise = getAuth().ensureAnonymousSession();
      expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
      resolveSignIn?.({ error: null });
      await expect(Promise.all([ensurePromise, signOutPromise])).resolves.toEqual([null, null]);
    });

    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('ne recrée pas de session anonyme quand une session existe déjà', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } } },
    });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('isAnonymous').props.children).toBe('true'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().ensureAnonymousSession();
    });

    expect(error).toBeNull();
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });

  it("retourne une erreur d'auth et signale le réseau indisponible si la session anonyme échoue", async () => {
    mockSignInAnonymously.mockRejectedValueOnce(new Error('network request failed'));
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().ensureAnonymousSession();
    });

    expect(error).toBeInstanceOf(AuthError);
    expect(getByTestId('isAnonymous').props.children).toBe('false');
    expect(getAuth().authServiceUnavailable).toBe(true);

    mockSignInAnonymously.mockResolvedValueOnce({ error: null });
    await act(async () => {
      await expect(getAuth().ensureAnonymousSession()).resolves.toBeNull();
    });
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(2);
  });

  it('stores the requested locale before sending the email-upgrade OTP', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } } },
    });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      await getAuth().beginEmailUpgrade('a@b.com', 'en');
    });

    expect(mockUpdateUser).toHaveBeenNthCalledWith(1, { data: { locale: 'en' } });
    expect(mockUpdateUser).toHaveBeenNthCalledWith(2, { email: 'a@b.com' });
  });

  it('still sends the email-upgrade OTP when locale synchronization fails', async () => {
    mockUpdateUser
      .mockResolvedValueOnce({ error: new AuthError('Network request failed') })
      .mockResolvedValueOnce({ error: null });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } } },
    });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().beginEmailUpgrade('a@b.com', 'en');
    });

    expect(error).toBeNull();
    expect(mockUpdateUser).toHaveBeenLastCalledWith({ email: 'a@b.com' });
    expect(getAuth().authServiceUnavailable).toBe(false);
  });

  it('still sends the email-upgrade OTP when locale synchronization rejects', async () => {
    mockUpdateUser
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValueOnce({ error: null });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } } },
    });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().beginEmailUpgrade('a@b.com', 'en');
    });

    expect(error).toBeNull();
    expect(mockUpdateUser).toHaveBeenLastCalledWith({ email: 'a@b.com' });
    expect(getAuth().authServiceUnavailable).toBe(false);
  });

  it('lie e-mail, vérifie le code puis ajoute le mot de passe au même compte', async () => {
    const guestSession = { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } };
    const permanentSession = { access_token: 'permanent-token', user: { id: 'guest', is_anonymous: false } };
    mockGetSession.mockResolvedValueOnce({ data: { session: guestSession } })
      .mockResolvedValueOnce({ data: { session: permanentSession } });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().completeEmailUpgrade('a@b.com', 'Aa!123456', '123456');
    });

    expect(error).toBeNull();
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      email: 'a@b.com', token: '123456', type: 'email_change',
    });
    expect(mockUpdateUser).toHaveBeenLastCalledWith({ password: 'Aa!123456' });
  });

  it("n'ajoute pas le mot de passe quand Supabase refuse le code", async () => {
    const otpError = new AuthError('Token has expired');
    mockVerifyOtp.mockResolvedValueOnce({ error: otpError });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } } },
    });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().completeEmailUpgrade('a@b.com', 'Aa!123456', '123456');
    });

    expect(error).toBe(otpError);
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('stores the requested locale before resending the email-upgrade OTP', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } } },
    });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      await getAuth().resendEmailUpgrade('a@b.com', 'en');
    });

    expect(mockUpdateUser).toHaveBeenCalledWith({ data: { locale: 'en' } });
    expect(mockResend).toHaveBeenCalledWith({ email: 'a@b.com', type: 'email_change' });
    expect(mockUpdateUser.mock.invocationCallOrder[0]).toBeLessThan(mockResend.mock.invocationCallOrder[0]);
  });

  it('still resends the email-upgrade OTP when locale synchronization fails', async () => {
    mockUpdateUser.mockResolvedValueOnce({ error: new AuthError('Network request failed') });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } } },
    });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().resendEmailUpgrade('a@b.com', 'en');
    });

    expect(error).toBeNull();
    expect(mockResend).toHaveBeenCalledWith({ email: 'a@b.com', type: 'email_change' });
    expect(getAuth().authServiceUnavailable).toBe(false);
  });

  it('still resends the email-upgrade OTP when locale synchronization rejects', async () => {
    mockUpdateUser.mockRejectedValueOnce(new Error('Network request failed'));
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } } },
    });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().resendEmailUpgrade('a@b.com', 'en');
    });

    expect(error).toBeNull();
    expect(mockResend).toHaveBeenCalledWith({ email: 'a@b.com', type: 'email_change' });
    expect(getAuth().authServiceUnavailable).toBe(false);
  });

  it("propage une erreur d'auth levée pendant le renvoi du code", async () => {
    const resendError = new AuthError('rate limit');
    mockResend.mockRejectedValueOnce(resendError);
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } } },
    });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().resendEmailUpgrade('a@b.com', 'fr');
    });

    expect(error).toBe(resendError);
  });

  it("signale une erreur réseau retournée pendant l'upgrade e-mail", async () => {
    const networkError = new AuthError('failed to fetch');
    mockUpdateUser
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: networkError });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } } },
    });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().beginEmailUpgrade('a@b.com', 'fr');
    });

    expect(error).toBe(networkError);
    expect(getAuth().authServiceUnavailable).toBe(true);
  });

  it.each(['beginEmailUpgrade', 'completeEmailUpgrade', 'resendEmailUpgrade'] as const)(
    'refuse %s sans session invitée',
    async (operation) => {
      const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      let error: AuthError | null = null;
      await act(async () => {
        if (operation === 'beginEmailUpgrade') error = await getAuth()[operation]('a@b.com', 'fr');
        if (operation === 'completeEmailUpgrade') error = await getAuth()[operation]('a@b.com', 'Aa!123456', '123456');
        if (operation === 'resendEmailUpgrade') error = await getAuth()[operation]('a@b.com', 'fr');
      });

      expect((error as AuthError | null)?.message).toBe('EMAIL_UPGRADE_UNAVAILABLE');
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(mockVerifyOtp).not.toHaveBeenCalled();
      expect(mockResend).not.toHaveBeenCalled();
    },
  );

  it('refuse la conversion e-mail depuis un compte permanent', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'permanent-token', user: { id: 'user', is_anonymous: false } } },
    });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('isAnonymous').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => { error = await getAuth().beginEmailUpgrade('a@b.com', 'fr'); });

    expect((error as AuthError | null)?.message).toBe('EMAIL_UPGRADE_UNAVAILABLE');
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('catégorise un échec de provisioning après un OTP valide sans invalider le compte', async () => {
    const guestSession = { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } };
    const permanentSession = { access_token: 'permanent-token', user: { id: 'guest', is_anonymous: false } };
    mockGetSession.mockResolvedValueOnce({ data: { session: guestSession } })
      .mockResolvedValueOnce({ data: { session: permanentSession } });
    mockProvisionUser.mockRejectedValueOnce(new Error('network request failed'));
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('isAnonymous').props.children).toBe('true'));

    let error: AuthError | null = null;
    await act(async () => { error = await getAuth().completeEmailUpgrade('a@b.com', 'Aa!123456', '123456'); });

    expect((error as AuthError | null)?.message).toBe('EMAIL_UPGRADE_PROVISIONING_FAILED');
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'Aa!123456' });
    expect(getAuth().isAnonymous).toBe(false);
  });

  it('refuse la réussite de l’upgrade si la session permanente disparaît après l’OTP', async () => {
    const guestSession = { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } };
    mockGetSession.mockResolvedValueOnce({ data: { session: guestSession } })
      .mockResolvedValueOnce({ data: { session: null } });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('isAnonymous').props.children).toBe('true'));

    let error: AuthError | null = null;
    await act(async () => { error = await getAuth().completeEmailUpgrade('a@b.com', 'Aa!123456', '123456'); });

    expect((error as AuthError | null)?.message).toBe('EMAIL_UPGRADE_PROVISIONING_FAILED');
    expect(mockProvisionUser).not.toHaveBeenCalled();
  });

  it('réessaie le provisioning avec la session permanente après un OTP déjà validé', async () => {
    const permanentSession = { access_token: 'permanent-token', user: { id: 'guest', is_anonymous: false } };
    mockGetSession.mockResolvedValue({ data: { session: permanentSession } });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => { expect(await getAuth().retryEmailUpgradeProvisioning()).toBeNull(); });

    expect(mockProvisionUser).toHaveBeenCalledWith('permanent-token');
  });

  it('refuse le retry de provisioning sans session permanente fraîche', async () => {
    const guestSession = { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } };
    mockGetSession.mockResolvedValue({ data: { session: guestSession } });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => { error = await getAuth().retryEmailUpgradeProvisioning(); });

    expect((error as AuthError | null)?.message).toBe('EMAIL_UPGRADE_PROVISIONING_UNAVAILABLE');
    expect(mockProvisionUser).not.toHaveBeenCalled();
  });

  describe('password reset', () => {
    it.each([
      { code: 'over_email_send_rate_limit' },
      { status: 429 },
      { message: 'Recovery rate limit exceeded' },
    ])('identifie une limite d’envoi Supabase: %o', (error) => {
      expect(isRateLimitError(error)).toBe(true);
    });

    it('journalise uniquement le diagnostic borné de la réponse de récupération', async () => {
      const resetError = Object.assign(new AuthError('Email send rate limit exceeded', 429), {
        code: 'over_email_send_rate_limit',
      });
      mockResetPasswordForEmail.mockResolvedValueOnce({ error: resetError });
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
      const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      await act(async () => {
        await getAuth().requestPasswordReset('a@b.com', 'fr');
      });

      expect(debugSpy).toHaveBeenCalledWith('[AuthContext] password reset result', {
        hasError: true,
        code: 'over_email_send_rate_limit',
        status: 429,
      });
    });

    it('demande exactement un code de réinitialisation sans modifier la session courante', async () => {
      const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      let error: AuthError | null = null;
      await act(async () => {
        error = await getAuth().requestPasswordReset('a@b.com', 'fr');
      });

      expect(error).toBeNull();
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('a@b.com', {
        data: { locale: 'fr' },
      });
      expect(mockResetPasswordForEmail).toHaveBeenCalledTimes(1);
    });

    it('vérifie le code recovery, fixe le mot de passe, puis provisionne', async () => {
      const permanentSession = {
        access_token: 'permanent-token', user: { id: 'u1', is_anonymous: false },
      };
      mockGetSession.mockResolvedValue({ data: { session: permanentSession } });
      const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      let error: AuthError | null = null;
      await act(async () => {
        error = await getAuth().completePasswordReset('a@b.com', '123456', 'NewPass1!');
      });

      expect(error).toBeNull();
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'a@b.com', token: '123456', type: 'recovery',
      });
      expect(mockUpdateUser).toHaveBeenLastCalledWith({ password: 'NewPass1!' });
      expect(mockProvisionUser).toHaveBeenCalledWith('permanent-token');
    });

    it("n'écrit pas le mot de passe si le code recovery est refusé", async () => {
      const verifyError = new AuthError('Token has expired or is invalid');
      mockVerifyOtp.mockResolvedValueOnce({ error: verifyError });
      const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      let error: AuthError | null = null;
      await act(async () => {
        error = await getAuth().completePasswordReset('a@b.com', '000000', 'NewPass1!');
      });

      expect(error).toBe(verifyError);
      expect(mockUpdateUser).not.toHaveBeenCalledWith({ password: 'NewPass1!' });
      expect(mockProvisionUser).not.toHaveBeenCalled();
    });

    it("ne provisionne pas si l'écriture du mot de passe est refusée", async () => {
      const passwordError = new AuthError('Password rejected');
      mockUpdateUser.mockResolvedValueOnce({ error: passwordError });
      const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      let error: AuthError | null = null;
      await act(async () => {
        error = await getAuth().completePasswordReset('a@b.com', '123456', 'NewPass1!');
      });

      expect(error).toBe(passwordError);
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'NewPass1!' });
      expect(mockProvisionUser).not.toHaveBeenCalled();
    });

    it("propage l'erreur de provisioning après le changement de mot de passe", async () => {
      const permanentSession = {
        access_token: 'permanent-token', user: { id: 'u1', is_anonymous: false },
      };
      const provisioningError = new AuthError('Provisioning failed');
      mockGetSession.mockResolvedValue({ data: { session: permanentSession } });
      mockProvisionUser.mockRejectedValueOnce(provisioningError);
      const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      let error: AuthError | null = null;
      await act(async () => {
        error = await getAuth().completePasswordReset('a@b.com', '123456', 'NewPass1!');
      });

      expect(error).toBe(provisioningError);
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'NewPass1!' });
      expect(mockProvisionUser).toHaveBeenCalledWith('permanent-token');
    });
  });

  it("lie le jeton Apple natif à la session anonyme au lieu de remplacer l'utilisateur", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'guest-token', user: { id: 'guest', is_anonymous: true } } },
    });
    const osSpy = jest.replaceProperty(Platform, 'OS', 'ios');
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('isAnonymous').props.children).toBe('true'));

    await act(async () => {
      await getAuth().signInWithApple('creation');
    });

    expect(mockGetRandomBytesAsync).toHaveBeenCalledWith(32);
    expect(mockDigestStringAsync).toHaveBeenCalledWith('SHA-256', '000102ff', {
      encoding: 'hex',
    });
    expect(mockAppleSignInAsync).toHaveBeenCalledWith({
      nonce: 'hashed-apple-nonce',
      requestedScopes: [0, 1],
    });
    expect(mockLinkIdentity).toHaveBeenCalledWith({
      provider: 'apple', token: 'apple-id-token', nonce: '000102ff',
    });
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
    osSpy.restore();
  });

  it("provisionne la session fraîche après le link Apple en conservant l'UUID invité", async () => {
    const linkedSession = {
      access_token: 'linked-token',
      user: { id: 'guest', is_anonymous: false },
    };
    mockGetSession
      .mockResolvedValueOnce({ data: { session: null } })
      .mockResolvedValueOnce({ data: { session: linkedSession } });
    mockLinkIdentity.mockResolvedValueOnce({ data: { identity: { id: 'apple' } }, error: null });
    const osSpy = jest.replaceProperty(Platform, 'OS', 'ios');
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      expect(await getAuth().signInWithApple('creation')).toBeNull();
    });

    expect(mockLinkIdentity).toHaveBeenCalled();
    expect(mockProvisionUser).toHaveBeenCalledWith('linked-token');
    expect(getAuth().session?.user.id).toBe('guest');
    osSpy.restore();
  });

  it("préserve l'UUID invité quand ensureAnonymousSession puis Apple s'enchaînent dans le même rendu", async () => {
    const guestSession = {
      access_token: 'guest-token',
      user: { id: 'guest', is_anonymous: true },
    };
    const linkedSession = {
      access_token: 'linked-token',
      user: { id: 'guest', is_anonymous: false },
    };
    mockGetSession
      .mockResolvedValueOnce({ data: { session: null } })
      .mockResolvedValueOnce({ data: { session: linkedSession } });
    mockSignInAnonymously.mockResolvedValueOnce({ data: { session: guestSession }, error: null });
    const osSpy = jest.replaceProperty(Platform, 'OS', 'ios');
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      expect(await getAuth().ensureAnonymousSession()).toBeNull();
      expect(await getAuth().signInWithApple('creation')).toBeNull();
    });

    expect(mockLinkIdentity).toHaveBeenCalledWith({
      provider: 'apple', token: 'apple-id-token', nonce: '000102ff',
    });
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
    osSpy.restore();
  });

  it("connecte le jeton Apple natif quand la session n'est pas anonyme", async () => {
    const osSpy = jest.replaceProperty(Platform, 'OS', 'ios');
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      await getAuth().signInWithApple('connexion');
    });

    expect(mockSignInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple', token: 'apple-id-token', nonce: '000102ff',
    });
    expect(mockLinkIdentity).not.toHaveBeenCalled();
    osSpy.restore();
  });

  it('provisionne Apple uniquement après obtention effective d’une session permanente', async () => {
    const permanentSession = {
      access_token: 'apple-token', user: { id: 'u1', is_anonymous: false },
    };
    mockGetSession.mockResolvedValue({ data: { session: permanentSession } });
    const osSpy = jest.replaceProperty(Platform, 'OS', 'ios');
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => { await getAuth().signInWithApple('connexion'); });

    expect(mockProvisionUser).toHaveBeenCalledWith('apple-token');
    osSpy.restore();
  });

  it("retourne l'erreur de provisioning après une connexion Apple réussie", async () => {
    const permanentSession = {
      access_token: 'apple-token', user: { id: 'u1', is_anonymous: false },
    };
    mockGetSession.mockResolvedValue({ data: { session: permanentSession } });
    const provisioningError = new Error('provisioning failed');
    mockProvisionUser.mockRejectedValueOnce(provisioningError);
    const osSpy = jest.replaceProperty(Platform, 'OS', 'ios');
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => { error = await getAuth().signInWithApple('connexion'); });

    expect(error).toBeInstanceOf(AuthError);
    expect(mockSignInWithIdToken).toHaveBeenCalled();
    osSpy.restore();
  });

  it("traite l'annulation Apple comme une sortie sans erreur", async () => {
    const osSpy = jest.replaceProperty(Platform, 'OS', 'ios');
    mockAppleSignInAsync.mockRejectedValueOnce(
      Object.assign(new Error('The user canceled'), { code: 'ERR_REQUEST_CANCELED' })
    );
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = new AuthError('not replaced');
    await act(async () => {
      error = await getAuth().signInWithApple('connexion');
    });

    expect(error).toBeNull();
    expect(mockLinkIdentity).not.toHaveBeenCalled();
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
    osSpy.restore();
  });

  it("refuse une crédential Apple qui ne contient pas de jeton d'identité", async () => {
    const osSpy = jest.replaceProperty(Platform, 'OS', 'ios');
    mockAppleSignInAsync.mockResolvedValueOnce({ identityToken: null });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().signInWithApple('connexion');
    });

    expect(error).toBeInstanceOf(AuthError);
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
    osSpy.restore();
  });

  it("normalise une panne Apple native en erreur d'auth réseau", async () => {
    const osSpy = jest.replaceProperty(Platform, 'OS', 'ios');
    mockAppleSignInAsync.mockRejectedValueOnce(new Error('network request failed'));
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().signInWithApple('connexion');
    });

    expect(error).toBeInstanceOf(AuthError);
    expect(getAuth().authServiceUnavailable).toBe(true);
    osSpy.restore();
  });

  it("propage une erreur d'auth Apple native sans la masquer", async () => {
    const osSpy = jest.replaceProperty(Platform, 'OS', 'ios');
    const appleError = new AuthError('Apple provider disabled');
    mockAppleSignInAsync.mockRejectedValueOnce(appleError);
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().signInWithApple('connexion');
    });

    expect(error).toBe(appleError);
    osSpy.restore();
  });

  it("ne lance jamais l'authentification Apple native hors iOS", async () => {
    const osSpy = jest.replaceProperty(Platform, 'OS', 'android');
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().signInWithApple('connexion');
    });

    expect(error).toBeInstanceOf(AuthError);
    expect(mockAppleSignInAsync).not.toHaveBeenCalled();
    osSpy.restore();
  });

  it('enregistre le sondage via le backend', async () => {
    mockGetSession.mockResolvedValueOnce({ data: {
      session: { access_token: 'test-token', user: { id: 'u1', is_anonymous: false } },
    } });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      await getAuth().saveSurvey({
        acquisitionSource: 'app_store',
        practice: 'hiker',
        newsletterOptIn: true,
      });
    });

    expect(mockUpdateUserSurvey).toHaveBeenCalledWith('test-token', {
      acquisitionSource: 'app_store', practice: 'hiker', newsletterOptIn: true,
    });
    expect(mockUpdateUser).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.anything() }));
  });

  it('envoie les réponses partielles sans inventer de réponses optionnelles', async () => {
    mockGetSession.mockResolvedValueOnce({ data: {
      session: { access_token: 'test-token', user: { id: 'u1', is_anonymous: false } },
    } });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      await getAuth().saveSurvey({ newsletterOptIn: false });
    });

    expect(mockUpdateUserSurvey).toHaveBeenCalledWith('test-token', { newsletterOptIn: false });
    expect(mockUpdateUser).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.anything() }));
  });

  it('clôt la session courante puis crée une session invitée', async () => {
    const anonymousSession = {
      access_token: 'guest-token', user: { id: 'guest', is_anonymous: true },
    };
    mockSignInAnonymously.mockImplementationOnce(async () => {
      return { data: { session: anonymousSession }, error: null };
    });
    mockGetSession.mockResolvedValueOnce({ data: { session: null } }).mockResolvedValueOnce({ data: { session: anonymousSession } });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      expect(await getAuth().signOutToAnonymous()).toBeNull();
    });

    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
    expect(getAuth().isAnonymous).toBe(true);
  });

  it('déconnecte quand même si la session invitée ne peut pas être créée', async () => {
    const permanentSession = {
      access_token: 'permanent-token', user: { id: 'account', is_anonymous: false },
    };
    mockGetSession.mockResolvedValueOnce({ data: { session: permanentSession } });
    const anonymousError = new AuthError('Anonymous sign-ins are disabled');
    mockSignInAnonymously.mockResolvedValueOnce({ error: anonymousError });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => { error = await getAuth().signOutToAnonymous(); });

    expect(error).toBe(anonymousError);
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(getAuth().isAnonymous).toBe(false);
    expect(getAuth().session).toBeNull();
  });

  it("refuse une session non anonyme retournée par l'API de session invitée", async () => {
    const permanentSession = {
      access_token: 'permanent-token', user: { id: 'account', is_anonymous: false },
    };
    mockGetSession.mockResolvedValueOnce({ data: { session: permanentSession } }).mockResolvedValueOnce({ data: { session: permanentSession } });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => { error = await getAuth().signOutToAnonymous(); });

    expect((error as unknown as AuthError).message).toBe('Session anonyme non confirmée');
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(getAuth().isAnonymous).toBe(false);
  });
});
