import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { AuthError, Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { deleteAccount as deleteAccountService } from '@/services/api/user';

function isNetworkError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const msg = e.message.toLowerCase();
  return msg.includes('network request failed') || msg.includes('failed to fetch');
}

export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface SurveyAnswers {
  acquisitionSource?: string;
  practice?: string;
  newsletterOptIn: boolean;
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  isAnonymous: boolean;
  authServiceUnavailable: boolean;
  locationPermission: LocationPermissionStatus;
}

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string) => Promise<AuthError | null>;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  ensureAnonymousSession: () => Promise<AuthError | null>;
  beginEmailUpgrade: (email: string) => Promise<AuthError | null>;
  completeEmailUpgrade: (email: string, password: string, code: string) => Promise<AuthError | null>;
  resendEmailUpgrade: (email: string) => Promise<AuthError | null>;
  signInWithApple: () => Promise<AuthError | null>;
  saveSurvey: (answer: SurveyAnswers) => Promise<AuthError | null>;
  signOutToAnonymous: () => Promise<void>;
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
  const isAnonymous = session?.user.is_anonymous === true;

  async function runAuthOperation(
    operation: () => Promise<{ error: AuthError | null }>
  ): Promise<AuthError | null> {
    try {
      const { error } = await operation();
      if (error && isNetworkError(error)) setAuthServiceUnavailable(true);
      return error;
    } catch (error) {
      if (isNetworkError(error)) setAuthServiceUnavailable(true);
      return error instanceof AuthError
        ? error
        : new AuthError('Service d\'authentification indisponible');
    }
  }

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

  async function ensureAnonymousSession(): Promise<AuthError | null> {
    if (session) return null;
    return runAuthOperation(() => supabase.auth.signInAnonymously());
  }

  async function beginEmailUpgrade(email: string): Promise<AuthError | null> {
    return runAuthOperation(() => supabase.auth.updateUser({ email }));
  }

  async function completeEmailUpgrade(
    email: string,
    password: string,
    code: string
  ): Promise<AuthError | null> {
    const verificationError = await runAuthOperation(() => supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email_change',
    }));
    if (verificationError) return verificationError;
    return runAuthOperation(() => supabase.auth.updateUser({ password }));
  }

  async function resendEmailUpgrade(email: string): Promise<AuthError | null> {
    return runAuthOperation(() => supabase.auth.resend({ email, type: 'email_change' }));
  }

  async function signInWithApple(): Promise<AuthError | null> {
    if (Platform.OS !== 'ios') {
      return new AuthError('Sign in with Apple est indisponible sur cette plateforme');
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        return new AuthError('Apple n\'a pas retourné de jeton d\'identité');
      }

      const appleCredentials = { provider: 'apple' as const, token: credential.identityToken };
      return isAnonymous
        ? runAuthOperation(() => supabase.auth.linkIdentity(appleCredentials))
        : runAuthOperation(() => supabase.auth.signInWithIdToken(appleCredentials));
    } catch (error) {
      if (
        typeof error === 'object'
        && error !== null
        && 'code' in error
        && error.code === 'ERR_REQUEST_CANCELED'
      ) {
        return null;
      }
      if (isNetworkError(error)) setAuthServiceUnavailable(true);
      return error instanceof AuthError
        ? error
        : new AuthError('Service d\'authentification indisponible');
    }
  }

  async function saveSurvey(answer: SurveyAnswers): Promise<AuthError | null> {
    return runAuthOperation(() => supabase.auth.updateUser({
      data: {
        ...(answer.acquisitionSource === undefined
          ? {}
          : { acquisition_source: answer.acquisitionSource }),
        ...(answer.practice === undefined ? {} : { practice: answer.practice }),
        newsletter_opt_in: answer.newsletterOptIn,
        survey_completed_at: new Date().toISOString(),
      },
    }));
  }

  async function signOutToAnonymous(): Promise<void> {
    await supabase.auth.signOut().catch(() => null);
    await runAuthOperation(() => supabase.auth.signInAnonymously());
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
        session, loading, isAnonymous, authServiceUnavailable, locationPermission,
        signUp, signIn, signOut, deleteAccount,
        ensureAnonymousSession, beginEmailUpgrade, completeEmailUpgrade,
        resendEmailUpgrade, signInWithApple, saveSurvey, signOutToAnonymous,
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
