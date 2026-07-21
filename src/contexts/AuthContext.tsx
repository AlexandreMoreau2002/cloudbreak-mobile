import * as Location from 'expo-location';
import { supabase } from '@/services/supabaseClient';
import { Session, AuthError } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { deleteAccount as deleteAccountService } from '@/services/api/user';

function isNetworkError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const msg = e.message.toLowerCase();
  return msg.includes('network request failed') || msg.includes('failed to fetch');
}

export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied';

interface AuthState {
  loading: boolean;
  session: Session | null;
  authServiceUnavailable: boolean;
  locationPermission: LocationPermissionStatus;
}

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string) => Promise<AuthError | null>;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setLocationPermission: (status: LocationPermissionStatus) => void;
  refreshLocationPermission: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authServiceUnavailable, setAuthServiceUnavailable] = useState(false);
  const [locationPermission, setLocationPermission] = useState<LocationPermissionStatus>('undetermined');

  const refreshLocationPermission = useCallback(async (): Promise<void> => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setLocationPermission(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined');
  }, []);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => setSession(data.session))
      .catch((e) => {
        if (isNetworkError(e)) setAuthServiceUnavailable(true);
        setSession(null);
      })
      .finally(() => setLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    void refreshLocationPermission();

    return () => listener.subscription.unsubscribe();
  }, [refreshLocationPermission]);

  async function signUp(email: string, password: string): Promise<AuthError | null> {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error && isNetworkError(error)) setAuthServiceUnavailable(true);
      return error;
    } catch {
      setAuthServiceUnavailable(true);
      return new AuthError('Service d\'authentification indisponible');
    }
  }

  async function signIn(email: string, password: string): Promise<AuthError | null> {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error && isNetworkError(error)) setAuthServiceUnavailable(true);
      return error;
    } catch {
      setAuthServiceUnavailable(true);
      return new AuthError('Service d\'authentification indisponible');
    }
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut().catch(() => null);
  }

  async function deleteAccount(): Promise<void> {
    const token = session?.access_token;
    if (!token) throw new Error('Non authentifié');
    await deleteAccountService(token);
    await supabase.auth.signOut().catch(() => null);
    await AsyncStorage.clear();
  }

  return (
    <AuthContext.Provider
      value={{
        session, loading, authServiceUnavailable, locationPermission,
        signUp, signIn, signOut, deleteAccount,
        setLocationPermission, refreshLocationPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
