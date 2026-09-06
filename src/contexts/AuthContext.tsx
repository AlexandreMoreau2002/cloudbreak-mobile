import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import { AuthError, Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  deleteAccount as deleteAccountService,
  provisionUser,
  updateUserSurvey,
  type UserSurvey,
} from '@/services/api/user';
import { DEBUG } from '@/constants/devConfig';
import { supabase } from '@/services/supabaseClient';

function isNetworkError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const msg = e.message.toLowerCase();
  return msg.includes('network request failed') || msg.includes('failed to fetch');
}

export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface SurveyAnswers {
  acquisitionSource?: UserSurvey['acquisitionSource'];
  practice?: UserSurvey['practice'];
  newsletterOptIn?: boolean;
  skipped?: boolean;
}

export type AppleAuthIntent = 'creation' | 'connexion';

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
  signInWithApple: (intent: AppleAuthIntent) => Promise<AuthError | null>;
  saveSurvey: (answer: SurveyAnswers) => Promise<AuthError | null>;
  signOutToAnonymous: () => Promise<AuthError | null>;
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
      if (DEBUG) console.debug('[AuthContext] auth state change', { event: _event, isAnonymous: newSession?.user.is_anonymous ?? null });
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error && isNetworkError(error)) setAuthServiceUnavailable(true);
      if (error) return error;
      if (data?.session) {
        setSession(data.session);
        return provisionPermanentSession(data.session.access_token);
      }
      return null;
    } catch {
      setAuthServiceUnavailable(true);
      return new AuthError('Service d\'authentification indisponible');
    }
  }

  async function provisionPermanentSession(token: string): Promise<AuthError | null> {
    try {
      await provisionUser(token);
      return null;
    } catch (error) {
      if (isNetworkError(error)) setAuthServiceUnavailable(true);
      return error instanceof AuthError ? error : new AuthError(
        error instanceof Error ? error.message : 'Provisioning du compte impossible',
      );
    }
  }

  async function provisionCurrentPermanentSession(): Promise<AuthError | null> {
    const { data } = await supabase.auth.getSession();
    const currentSession = data.session;
    if (!currentSession || currentSession.user.is_anonymous === true) return null;
    setSession(currentSession);
    return provisionPermanentSession(currentSession.access_token);
  }

  async function ensureAnonymousSession(): Promise<AuthError | null> {
    if (session) return null;
    if (DEBUG) console.debug('[AuthContext] ensureAnonymousSession → signInAnonymously');
    return runAuthOperation(() => supabase.auth.signInAnonymously());
  }

  async function beginEmailUpgrade(email: string): Promise<AuthError | null> {
    // Ajoute l'e-mail au compte anonyme courant → Supabase envoie un OTP (type email_change).
    if (DEBUG) console.debug('[AuthContext] beginEmailUpgrade', { email });
    return runAuthOperation(() => supabase.auth.updateUser({ email }));
  }

  async function completeEmailUpgrade(
    email: string,
    password: string,
    code: string
  ): Promise<AuthError | null> {
    if (DEBUG) console.debug('[AuthContext] completeEmailUpgrade', { email });
    const verificationError = await runAuthOperation(() =>
      supabase.auth.verifyOtp({ email, token: code, type: 'email_change' }),
    );
    if (verificationError) return verificationError;
    const passwordError = await runAuthOperation(() => supabase.auth.updateUser({ password }));
    if (passwordError) return passwordError;
    return provisionCurrentPermanentSession();
  }

  async function resendEmailUpgrade(email: string): Promise<AuthError | null> {
    if (DEBUG) console.debug('[AuthContext] resendEmailUpgrade', { email });
    return runAuthOperation(() => supabase.auth.resend({ email, type: 'email_change' }));
  }

  async function signInWithApple(intent: AppleAuthIntent): Promise<AuthError | null> {
    if (Platform.OS !== 'ios') {
      return new AuthError('Sign in with Apple est indisponible sur cette plateforme');
    }

    try {
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const rawNonce = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      const credential = await AppleAuthentication.signInAsync({
        nonce: hashedNonce,
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        return new AuthError('Apple n\'a pas retourné de jeton d\'identité');
      }

      const appleCredentials = {
        provider: 'apple' as const,
        token: credential.identityToken,
        nonce: rawNonce,
      };
      if (DEBUG) console.debug('[AuthContext] signInWithApple', { intent });
      const authError = intent === 'creation'
        ? await runAuthOperation(() => supabase.auth.linkIdentity(appleCredentials))
        : await runAuthOperation(() => supabase.auth.signInWithIdToken(appleCredentials));
      if (authError) return authError;
      // Auth state callbacks are asynchronous; always read the session after
      // the provider call so provisioning uses the session Supabase actually
      // established (and preserves the anonymous UUID for linkIdentity).
      return provisionCurrentPermanentSession();
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
    const token = session?.access_token;
    if (!token || session?.user.is_anonymous === true) return new AuthError('Non authentifié');
    try {
      await updateUserSurvey(token, answer);
      return null;
    } catch (error) {
      if (isNetworkError(error)) setAuthServiceUnavailable(true);
      return error instanceof AuthError ? error : new AuthError(
        error instanceof Error ? error.message : 'Enregistrement du sondage impossible',
      );
    }
  }

  async function signOutToAnonymous(): Promise<AuthError | null> {
    if (DEBUG) console.debug('[AuthContext] signOutToAnonymous → clear session then new guest session');
    // Toujours clore la session courante d'abord : "Se déconnecter" ne doit jamais
    // laisser l'utilisateur bloqué sur son ancien compte si la session invitée échoue.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => null);
    setSession(null);
    const error = await runAuthOperation(() => supabase.auth.signInAnonymously());
    if (error) return error;
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user.is_anonymous) {
      return new AuthError('Session anonyme non confirmée');
    }
    setSession(data.session);
    return null;
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => null);
  }

  async function deleteAccount(): Promise<void> {
    const token = session?.access_token;
    if (!token) throw new Error('Non authentifié');
    await deleteAccountService(token);
    await supabase.auth.signOut({ scope: 'local' }).catch(() => null);
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
