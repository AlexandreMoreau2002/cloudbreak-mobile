import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { AuthError, Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DEBUG } from '@/constants/devConfig';
import { supabase } from '@/services/supabaseClient';
import {
  deleteAccount as deleteAccountService,
  provisionUser,
  updateUserSurvey,
  type UserSurvey,
} from '@/services/api/user';

function isNetworkError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const code = (e as Error & { code?: string }).code;
  if (code === 'NETWORK_UNREACHABLE' || code === 'NETWORK_TIMEOUT') return true;
  const msg = e.message.toLowerCase();
  return msg.includes('network request failed') || msg.includes('failed to fetch');
}

const TERMINAL_SESSION_ERROR_CODES = new Set([
  'bad_jwt',
  'invalid_jwt',
  'refresh_token_not_found',
  'session_not_found',
  'user_not_found',
]);

const TERMINAL_SESSION_ERROR_MESSAGES = new Set([
  'auth session missing!',
  'invalid jwt',
  'jwt expired',
  'user not found',
]);

function isTerminalSessionError(error: unknown): boolean {
  if (!(error instanceof AuthError)) return false;
  const code = error.code?.toLowerCase();
  if (code && TERMINAL_SESSION_ERROR_CODES.has(code)) return true;
  return TERMINAL_SESSION_ERROR_MESSAGES.has(error.message.trim().toLowerCase());
}

export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface SurveyAnswers {
  acquisitionSource?: UserSurvey['acquisitionSource'];
  practice?: UserSurvey['practice'];
  newsletterOptIn?: boolean;
  skipped?: boolean;
}

export type AppleAuthIntent = 'creation' | 'connexion';
type AuthEmailLocale = 'fr' | 'en';

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
  requestPasswordReset: (email: string, locale: AuthEmailLocale) => Promise<AuthError | null>;
  completePasswordReset: (email: string, code: string, newPassword: string) => Promise<AuthError | null>;
  beginEmailUpgrade: (email: string, locale: AuthEmailLocale) => Promise<AuthError | null>;
  completeEmailUpgrade: (email: string, password: string, code: string) => Promise<AuthError | null>;
  retryEmailUpgradeProvisioning: () => Promise<AuthError | null>;
  resendEmailUpgrade: (email: string, locale: AuthEmailLocale) => Promise<AuthError | null>;
  signInWithApple: (intent: AppleAuthIntent) => Promise<AuthError | null>;
  saveSurvey: (answer: SurveyAnswers) => Promise<AuthError | null>;
  signOutToAnonymous: () => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setLocationPermission: (status: LocationPermissionStatus) => void;
  refreshLocationPermission: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthOperationStage =
  | 'anonymous_sign_in'
  | 'email_otp_start'
  | 'email_otp_verify'
  | 'email_otp_resend'
  | 'email_password_set'
  | 'password_reset_request'
  | 'password_reset_verify'
  | 'password_set'
  | 'email_provision_session'
  | 'email_provision_api'
  | 'permanent_provision'
  | 'apple_identity_link'
  | 'apple_id_token_sign_in';

type AuthOperationOutcome = 'success' | 'auth_error' | 'network_error' | 'unexpected_error';

function logAuthOperation(stage: AuthOperationStage, outcome: AuthOperationOutcome): void {
  // Intentionally contains no e-mail, OTP, access token or Supabase error message.
  if (DEBUG) console.debug('[AuthContext] auth operation', { stage, outcome });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authServiceUnavailable, setAuthServiceUnavailable] = useState(false);
  const [locationPermission, setLocationPermission] = useState<LocationPermissionStatus>('undetermined');
  const anonymousSessionInFlight = useRef<Promise<AuthError | null> | null>(null);
  const sessionGeneration = useRef(0);
  const isAnonymous = session?.user.is_anonymous === true;

  async function runAuthOperation(
    stage: AuthOperationStage,
    operation: () => Promise<{ error: AuthError | null }>
  ): Promise<AuthError | null> {
    try {
      const { error } = await operation();
      if (error) {
        const outcome = isNetworkError(error) ? 'network_error' : 'auth_error';
        if (outcome === 'network_error') setAuthServiceUnavailable(true);
        logAuthOperation(stage, outcome);
      } else {
        logAuthOperation(stage, 'success');
      }
      return error;
    } catch (error) {
      const outcome = isNetworkError(error) ? 'network_error' : 'unexpected_error';
      if (outcome === 'network_error') setAuthServiceUnavailable(true);
      logAuthOperation(stage, outcome);
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
    let isActive = true;
    const bootstrapGeneration = sessionGeneration.current;
    const isCurrentBootstrap = () => isActive && sessionGeneration.current === bootstrapGeneration;

    async function initializeSession(): Promise<void> {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isCurrentBootstrap()) return;
        const storedSession = data.session;
        if (!storedSession) {
          setSession(null);
          return;
        }

        try {
          const { data: userData, error } = await supabase.auth.getUser();
          if (!isCurrentBootstrap()) return;
          if (error && !isTerminalSessionError(error)) {
            setAuthServiceUnavailable(true);
            setSession(storedSession);
            return;
          }
          if (!error && userData.user) {
            setSession(storedSession);
            return;
          }
        } catch {
          if (!isCurrentBootstrap()) return;
          // A rejected SDK call gives no proof that the remote identity was deleted.
          // Preserve the existing session and make the temporary service state visible.
          setAuthServiceUnavailable(true);
          setSession(storedSession);
          return;
        }

        if (!isCurrentBootstrap()) return;
        await supabase.auth.signOut({ scope: 'local' }).catch(() => null);
        if (!isCurrentBootstrap()) return;
        setSession(null);
      } catch (error) {
        if (!isCurrentBootstrap()) return;
        if (isNetworkError(error)) setAuthServiceUnavailable(true);
        setSession(null);
      } finally {
        if (isActive) setLoading(false);
      }
    }

    void initializeSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isActive) return;
      if (_event === 'INITIAL_SESSION') return;
      if (DEBUG) console.debug('[AuthContext] auth state change', { event: _event, isAnonymous: newSession?.user.is_anonymous ?? null });
      sessionGeneration.current += 1;
      setSession(newSession);
    });

    void refreshLocationPermission();

    return () => {
      isActive = false;
      listener.subscription.unsubscribe();
    };
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

  async function provisionPermanentSession(
    token: string,
    stage: AuthOperationStage = 'permanent_provision',
  ): Promise<AuthError | null> {
    try {
      await provisionUser(token);
      logAuthOperation(stage, 'success');
      return null;
    } catch (error) {
      const outcome = isNetworkError(error) ? 'network_error' : 'unexpected_error';
      if (outcome === 'network_error') setAuthServiceUnavailable(true);
      logAuthOperation(stage, outcome);
      return error instanceof AuthError ? error : new AuthError('PROVISIONING_FAILED');
    }
  }

  async function provisionCurrentPermanentSession(): Promise<AuthError | null> {
    try {
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session;
      if (!currentSession || currentSession.user.is_anonymous === true) {
        logAuthOperation('email_provision_session', 'auth_error');
        return new AuthError('EMAIL_UPGRADE_PROVISIONING_UNAVAILABLE');
      }
      setSession(currentSession);
      logAuthOperation('email_provision_session', 'success');
      return provisionPermanentSession(currentSession.access_token, 'email_provision_api');
    } catch (error) {
      const outcome = isNetworkError(error) ? 'network_error' : 'unexpected_error';
      if (outcome === 'network_error') setAuthServiceUnavailable(true);
      logAuthOperation('email_provision_session', outcome);
      return error instanceof AuthError
        ? error
        : new AuthError('Provisioning du compte impossible');
    }
  }

  function requireAnonymousSession(): AuthError | null {
    if (session?.user.is_anonymous === true) return null;
    return new AuthError('EMAIL_UPGRADE_UNAVAILABLE');
  }

  async function signInAnonymouslyWithLock(): Promise<AuthError | null> {
    if (anonymousSessionInFlight.current) return anonymousSessionInFlight.current;
    if (DEBUG) console.debug('[AuthContext] ensureAnonymousSession → signInAnonymously');
    let promise!: Promise<AuthError | null>;
    promise = (async () => {
      try {
        return await runAuthOperation('anonymous_sign_in', () => supabase.auth.signInAnonymously());
      } finally {
        if (anonymousSessionInFlight.current === promise) anonymousSessionInFlight.current = null;
      }
    })();
    anonymousSessionInFlight.current = promise;
    return promise;
  }

  async function ensureAnonymousSession(): Promise<AuthError | null> {
    if (session) return null;
    return signInAnonymouslyWithLock();
  }

  async function syncEmailLocale(locale: AuthEmailLocale): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({ data: { locale } });
      if (error && DEBUG) console.debug('[AuthContext] email locale sync unavailable');
    } catch {
      if (DEBUG) console.debug('[AuthContext] email locale sync unavailable');
    }
  }

  async function beginEmailUpgrade(email: string, locale: AuthEmailLocale): Promise<AuthError | null> {
    // Ajoute l'e-mail au compte anonyme courant → Supabase envoie un OTP (type email_change).
    const unavailableError = requireAnonymousSession();
    if (unavailableError) return unavailableError;
    if (DEBUG) console.debug('[AuthContext] beginEmailUpgrade');
    await syncEmailLocale(locale);
    return runAuthOperation('email_otp_start', () => supabase.auth.updateUser({ email }));
  }

  async function requestPasswordReset(
    email: string,
    locale: AuthEmailLocale,
  ): Promise<AuthError | null> {
    if (DEBUG) console.debug('[AuthContext] requestPasswordReset');
    await syncEmailLocale(locale);
    return runAuthOperation('password_reset_request', () =>
      supabase.auth.resetPasswordForEmail(email),
    );
  }

  async function completePasswordReset(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<AuthError | null> {
    if (DEBUG) console.debug('[AuthContext] completePasswordReset', { codeLength: code.length });
    const verificationError = await runAuthOperation('password_reset_verify', () =>
      supabase.auth.verifyOtp({ email, token: code, type: 'recovery' }),
    );
    if (verificationError) return verificationError;
    const passwordError = await runAuthOperation('password_set', () =>
      supabase.auth.updateUser({ password: newPassword }),
    );
    if (passwordError) return passwordError;
    return provisionCurrentPermanentSession();
  }

  async function completeEmailUpgrade(
    email: string,
    password: string,
    code: string
  ): Promise<AuthError | null> {
    const unavailableError = requireAnonymousSession();
    if (unavailableError) return unavailableError;
    if (DEBUG) console.debug('[AuthContext] completeEmailUpgrade', { codeLength: code.length });
    const verificationError = await runAuthOperation('email_otp_verify', () =>
      supabase.auth.verifyOtp({ email, token: code, type: 'email_change' }),
    );
    if (verificationError) return verificationError;
    const passwordError = await runAuthOperation('email_password_set', () => supabase.auth.updateUser({ password }));
    if (passwordError) return passwordError;
    const provisioningError = await provisionCurrentPermanentSession();
    return provisioningError ? new AuthError('EMAIL_UPGRADE_PROVISIONING_FAILED') : null;
  }

  async function resendEmailUpgrade(email: string, locale: AuthEmailLocale): Promise<AuthError | null> {
    const unavailableError = requireAnonymousSession();
    if (unavailableError) return unavailableError;
    if (DEBUG) console.debug('[AuthContext] resendEmailUpgrade');
    await syncEmailLocale(locale);
    return runAuthOperation('email_otp_resend', () =>
      supabase.auth.resend({ email, type: 'email_change' }),
    );
  }

  async function retryEmailUpgradeProvisioning(): Promise<AuthError | null> {
    try {
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session;
      if (!currentSession || currentSession.user.is_anonymous === true) {
        return new AuthError('EMAIL_UPGRADE_PROVISIONING_UNAVAILABLE');
      }
      setSession(currentSession);
      const provisioningError = await provisionPermanentSession(currentSession.access_token);
      return provisioningError ? new AuthError('EMAIL_UPGRADE_PROVISIONING_FAILED') : null;
    } catch (error) {
      if (isNetworkError(error)) setAuthServiceUnavailable(true);
      return new AuthError('EMAIL_UPGRADE_PROVISIONING_FAILED');
    }
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
        ? await runAuthOperation('apple_identity_link', () => supabase.auth.linkIdentity(appleCredentials))
        : await runAuthOperation('apple_id_token_sign_in', () => supabase.auth.signInWithIdToken(appleCredentials));
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
    const error = await signInAnonymouslyWithLock();
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
        ensureAnonymousSession, requestPasswordReset, completePasswordReset,
        beginEmailUpgrade, completeEmailUpgrade,
        resendEmailUpgrade, retryEmailUpgradeProvisioning, signInWithApple, saveSurvey, signOutToAnonymous,
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
