import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { Text, TouchableOpacity } from 'react-native';
import { render, waitFor, fireEvent } from '@testing-library/react-native';

const mockUnsubscribe = jest.fn();
const mockGetSession = jest.fn().mockResolvedValue({ data: { session: null } });
const mockOnAuthStateChange = jest.fn().mockReturnValue({
  data: { subscription: { unsubscribe: mockUnsubscribe } },
});
const mockSignOut = jest.fn().mockResolvedValue(undefined);
const mockSignIn = jest.fn().mockResolvedValue({ error: null });
const mockSignUp = jest.fn().mockResolvedValue({ error: null });

jest.mock('../services/supabaseClient', () => ({
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
  const { session, loading, signIn, signUp, signOut } = useAuth();
  return (
    <>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="session">{session ? 'connected' : 'disconnected'}</Text>
      <TouchableOpacity testID="signIn" onPress={() => signIn('a@b.com', 'pass')} />
      <TouchableOpacity testID="signUp" onPress={() => signUp('a@b.com', 'pass')} />
      <TouchableOpacity testID="signOut" onPress={() => signOut()} />
    </>
  );
}

describe('AuthContext', () => {
  beforeEach(() => jest.clearAllMocks());

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

  it('useAuth lance une erreur hors AuthProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within AuthProvider');
    consoleError.mockRestore();
  });
});
