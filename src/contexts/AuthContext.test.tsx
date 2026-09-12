import React from 'react';
import { deleteAccount } from '@/services/api/user';
import { Text, TouchableOpacity } from 'react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { render, waitFor, fireEvent } from '@testing-library/react-native';

const mockUnsubscribe = jest.fn();
const mockGetSession = jest.fn().mockResolvedValue({ data: { session: null } });
const mockOnAuthStateChange = jest.fn().mockReturnValue({
  data: { subscription: { unsubscribe: mockUnsubscribe } },
});
const mockSignOut = jest.fn().mockResolvedValue(undefined);
const mockSignIn = jest.fn().mockResolvedValue({ error: null });
const mockSignUp = jest.fn().mockResolvedValue({ error: null });
const mockAsyncStorageClear = jest.fn().mockResolvedValue(undefined);

jest.mock('@react-native-async-storage/async-storage', () => ({
  get clear() { return mockAsyncStorageClear; },
  get default() { return { clear: mockAsyncStorageClear }; },
}));

jest.mock('@/services/api/user', () => ({
  deleteAccount: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
}));

const mockDeleteAccount = deleteAccount as jest.MockedFunction<typeof deleteAccount>;

jest.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: {
      get signUp() { return mockSignUp; },
      get signOut() { return mockSignOut; },
      get getSession() { return mockGetSession; },
      get signInWithPassword() { return mockSignIn; },
      get onAuthStateChange() { return mockOnAuthStateChange; },
    },
  },
}));

function TestConsumer() {
  const {
    session, loading, signIn, signUp, signOut,
    deleteAccount: deleteUserAccount,
    locationPermission, setLocationPermission, refreshLocationPermission,
  } = useAuth();
  return (
    <>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="session">{session ? 'connected' : 'disconnected'}</Text>
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
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignOut.mockResolvedValue(undefined);
    mockSignIn.mockResolvedValue({ error: null });
    mockSignUp.mockResolvedValue({ error: null });
    mockDeleteAccount.mockResolvedValue(undefined);
    mockAsyncStorageClear.mockResolvedValue(undefined);
    jest.requireMock('expo-location').getForegroundPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
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
    expect(mockSignOut).toHaveBeenCalledTimes(1);
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
    expect(mockSignOut).toHaveBeenCalledTimes(1);
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
});
