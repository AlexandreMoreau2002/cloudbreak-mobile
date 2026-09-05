import { AuthError } from '@supabase/supabase-js';
import { Text, TouchableOpacity, Platform } from 'react-native';
import { act, render, waitFor, fireEvent } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import React from 'react';
import { deleteAccount, provisionUser, updateUserSurvey } from '@/services/api/user';

const mockUnsubscribe = jest.fn();
const mockGetSession = jest.fn().mockResolvedValue({ data: { session: null } });
const mockOnAuthStateChange = jest.fn().mockReturnValue({
  data: { subscription: { unsubscribe: mockUnsubscribe } },
});
const mockSignOut = jest.fn().mockResolvedValue(undefined);
const mockSignIn = jest.fn().mockResolvedValue({ error: null });
const mockSignUp = jest.fn().mockResolvedValue({ error: null });
const mockResend = jest.fn().mockResolvedValue({ error: null });
const mockUpdateUser = jest.fn().mockResolvedValue({ error: null });
const mockVerifyOtp = jest.fn().mockResolvedValue({ error: null });
const mockLinkIdentity = jest.fn().mockResolvedValue({ error: null });
const mockSignInAnonymously = jest.fn().mockResolvedValue({ error: null });
const mockSignInWithIdToken = jest.fn().mockResolvedValue({ error: null });
const mockAppleSignInAsync = jest.fn().mockResolvedValue({ identityToken: 'apple-id-token' });
const mockGetRandomBytesAsync = jest.fn().mockResolvedValue(Uint8Array.from([0, 1, 2, 255]));
const mockDigestStringAsync = jest.fn().mockResolvedValue('hashed-apple-nonce');
const mockAsyncStorageClear = jest.fn().mockResolvedValue(undefined);

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
      get linkIdentity() { return mockLinkIdentity; },
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
    mockSignOut.mockResolvedValue(undefined);
    mockSignIn.mockResolvedValue({ error: null });
    mockSignUp.mockResolvedValue({ error: null });
    mockResend.mockResolvedValue({ error: null });
    mockUpdateUser.mockResolvedValue({ error: null });
    mockVerifyOtp.mockResolvedValue({ error: null });
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
  });

  it("démarre l'upgrade e-mail sur le compte anonyme courant", async () => {
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      await getAuth().beginEmailUpgrade('a@b.com');
    });

    expect(mockUpdateUser).toHaveBeenCalledWith({ email: 'a@b.com' });
  });

  it('lie e-mail, vérifie le code puis ajoute le mot de passe au même compte', async () => {
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
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().completeEmailUpgrade('a@b.com', 'Aa!123456', '123456');
    });

    expect(error).toBe(otpError);
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("renvoie l'OTP de changement d'e-mail à la nouvelle adresse", async () => {
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      await getAuth().resendEmailUpgrade('a@b.com');
    });

    expect(mockResend).toHaveBeenCalledWith({ email: 'a@b.com', type: 'email_change' });
  });

  it("propage une erreur d'auth levée pendant le renvoi du code", async () => {
    const resendError = new AuthError('rate limit');
    mockResend.mockRejectedValueOnce(resendError);
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().resendEmailUpgrade('a@b.com');
    });

    expect(error).toBe(resendError);
  });

  it("signale une erreur réseau retournée pendant l'upgrade e-mail", async () => {
    const networkError = new AuthError('failed to fetch');
    mockUpdateUser.mockResolvedValueOnce({ error: networkError });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().beginEmailUpgrade('a@b.com');
    });

    expect(error).toBe(networkError);
    expect(getAuth().authServiceUnavailable).toBe(true);
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
    mockGetSession
      .mockResolvedValueOnce({ data: { session: null } })
      .mockResolvedValueOnce({ data: { session: guestSession } });
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

  it('se déconnecte puis recrée une session invitée', async () => {
    const calls: string[] = [];
    mockSignOut.mockImplementationOnce(async () => {
      calls.push('signOut');
      return { error: null };
    });
    mockSignInAnonymously.mockImplementationOnce(async () => {
      calls.push('signInAnonymously');
      return { error: null };
    });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      await getAuth().signOutToAnonymous();
    });

    expect(calls).toEqual(['signOut', 'signInAnonymously']);
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('recrée une session invitée même si la déconnexion locale rejette', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('network down'));
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      await getAuth().signOutToAnonymous();
    });

    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("retourne l'erreur quand la recréation de session invitée échoue", async () => {
    const anonymousError = new AuthError('Anonymous sign-ins are disabled');
    mockSignInAnonymously.mockResolvedValueOnce({ error: anonymousError });
    const { getByTestId } = render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    let error: AuthError | null = null;
    await act(async () => {
      error = await getAuth().signOutToAnonymous();
    });

    expect(error).toBe(anonymousError);
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
