import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addFavorite } from '@/services/api/user';
import { DEBUG } from '@/constants/devConfig';
import { supabase } from '@/services/supabaseClient';

const ACCOUNT_PROMPT_SEEN_KEY = 'hasSeenAccountPrompt';
type AccountReturnRoute = '/(tabs)' | '/(tabs)/search' | '/(tabs)/favorites' | '/(tabs)/profile';
type AccountEntryMode = 'creation' | 'login';
export type PendingAction =
  | { kind: 'favorite'; peakId: string }
  | { kind: 'quota'; retry: () => void | Promise<void> }
  | { kind: 'first_run' };
export interface EmailUpgradeCredentials {
  email: string;
  password: string;
}
export interface FinishAccountCreationResult {
  replayFailed: boolean;
}
interface AccountGateValue {
  pendingAction: PendingAction | null;
  requireAccount: (action: PendingAction) => void;
  openAccount: (mode: AccountEntryMode) => void;
  finishAccountCreation: () => Promise<FinishAccountCreationResult>;
  cancelAccountFlow: () => Promise<void>;
  maybePromptFirstRun: () => Promise<void>;
  emailUpgradeCredentials: EmailUpgradeCredentials | null;
  setEmailUpgradeCredentials: (credentials: EmailUpgradeCredentials) => void;
}
const AccountGateContext = createContext<AccountGateValue | null>(null);

export function AccountGateProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { session } = useAuth();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [emailUpgradeCredentials, setEmailUpgradeCredentials] = useState<EmailUpgradeCredentials | null>(null);
  const firstRunPromptChecked = useRef(false);
  const returnRoute = useRef<AccountReturnRoute>('/(tabs)');
  const captureReturnRoute = useCallback(() => {
    const currentSegment = (segments as readonly string[])[1];
    returnRoute.current = currentSegment === 'search'
      ? '/(tabs)/search'
      : currentSegment === 'favorites'
        ? '/(tabs)/favorites'
        : currentSegment === 'profile'
          ? '/(tabs)/profile'
          : '/(tabs)';
  }, [segments]);
  const restoreReturnRoute = useCallback(() => router.dismissTo(returnRoute.current as never), [router]);
  const requireAccount = useCallback((action: PendingAction) => {
    captureReturnRoute();
    if (DEBUG) console.debug('[AccountGate] requireAccount', { kind: action.kind, returnRoute: returnRoute.current });
    setPendingAction(action);
    router.push(action.kind === 'first_run' ? { pathname: '/account', params: { firstRun: '1' } } : '/account');
  }, [captureReturnRoute, router]);
  const openAccount = useCallback((mode: AccountEntryMode) => {
    captureReturnRoute();
    if (DEBUG) console.debug('[AccountGate] openAccount', { mode, returnRoute: returnRoute.current });
    router.push({ pathname: '/account', params: { mode } });
  }, [captureReturnRoute, router]);
  const markPromptSeen = useCallback(async () => {
    firstRunPromptChecked.current = true;
    try {
      await AsyncStorage.setItem(ACCOUNT_PROMPT_SEEN_KEY, 'true');
    } catch {
      // Persistence is best-effort. The in-memory gate state already avoids
      // reopening the prompt during this app session.
    }
  }, []);
  const finishAccountCreation = useCallback(async () => {
    const action = pendingAction;
    setEmailUpgradeCredentials(null);
    if (!action) return { replayFailed: false };
    setPendingAction(null);
    if (action.kind === 'first_run') {
      await markPromptSeen();
      router.replace('/(tabs)' as never);
      return { replayFailed: false };
    }
    try {
      // Auth state updates are asynchronous. Read Supabase's session here rather
      // than using the session captured by the render that opened the gate.
      const { data } = await supabase.auth.getSession();
      const freshSession = data.session;
      if (DEBUG) console.debug('[AccountGate] finishAccountCreation', { kind: action.kind, isAnonymous: freshSession?.user.is_anonymous ?? null });
      if (!freshSession || freshSession.user.is_anonymous) {
        restoreReturnRoute();
        return { replayFailed: false };
      }
      if (action.kind === 'favorite') {
        await addFavorite(freshSession.access_token, action.peakId);
        restoreReturnRoute();
        return { replayFailed: false };
      }
      await action.retry();
      restoreReturnRoute();
      return { replayFailed: false };
    } catch {
      if (DEBUG) console.debug('[AccountGate] finishAccountCreation replay failed', { kind: action.kind });
      return { replayFailed: true };
    }
  }, [markPromptSeen, pendingAction, restoreReturnRoute, router]);
  const cancelAccountFlow = useCallback(async () => {
    const action = pendingAction;
    setEmailUpgradeCredentials(null);
    setPendingAction(null);
    await markPromptSeen();
    if (action?.kind === 'first_run') {
      router.replace('/(tabs)' as never);
      return;
    }
    restoreReturnRoute();
  }, [markPromptSeen, pendingAction, restoreReturnRoute, router]);
  const maybePromptFirstRun = useCallback(async () => {
    if (firstRunPromptChecked.current || !session?.user.is_anonymous) return;
    firstRunPromptChecked.current = true;
    try {
      const seen = await AsyncStorage.getItem(ACCOUNT_PROMPT_SEEN_KEY);
      if (!seen) requireAccount({ kind: 'first_run' });
    } catch {
      // Storage is best-effort: do not block the app or repeatedly prompt on failure.
    }
  }, [requireAccount, session]);
  return <AccountGateContext.Provider value={{ pendingAction, requireAccount, openAccount, finishAccountCreation, cancelAccountFlow, maybePromptFirstRun, emailUpgradeCredentials, setEmailUpgradeCredentials }}>{children}</AccountGateContext.Provider>;
}
export function useAccountGate(): AccountGateValue {
  const value = useContext(AccountGateContext);
  if (!value) throw new Error('useAccountGate must be used within AccountGateProvider');
  return value;
}
