import { supabase } from '@/services/supabaseClient';
import { Session, AuthError } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { deleteAccount as deleteAccountService } from '@/services/api/user';

function isNetworkError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const msg = e.message.toLowerCase();
  return msg.includes('network request failed') || msg.includes('failed to fetch');
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  authServiceUnavailable: boolean;
}

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string) => Promise<AuthError | null>;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authServiceUnavailable, setAuthServiceUnavailable] = useState(false);

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

    return () => listener.subscription.unsubscribe();
  }, []);

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
    <AuthContext.Provider value={{ session, loading, authServiceUnavailable, signUp, signIn, signOut, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
