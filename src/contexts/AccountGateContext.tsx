import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addFavorite } from '@/services/api/user';
import { supabase } from '@/services/supabaseClient';

const ACCOUNT_PROMPT_SEEN_KEY = 'hasSeenAccountPrompt';
export type PendingAction =
  | { kind: 'favorite'; peakId: string }
  | { kind: 'quota'; retry: () => void | Promise<void> }
  | { kind: 'first_run' };
export interface EmailUpgradeCredentials {
  email: string;
  password: string;
}
interface AccountGateValue {
  pendingAction: PendingAction | null;
  requireAccount: (action: PendingAction) => void;
  finishAccountCreation: () => Promise<void>;
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
  const returnRoute = useRef('/(tabs)');
  const restoreReturnRoute = useCallback(() => router.replace(returnRoute.current as '/(tabs)' | '/(tabs)/search' | '/(tabs)/favorites' | '/(tabs)/profile'), [router]);
  const requireAccount = useCallback((action: PendingAction) => {
    const currentSegment = (segments as readonly string[])[1];
    returnRoute.current = currentSegment === 'search'
      ? '/(tabs)/search'
      : currentSegment === 'favorites'
        ? '/(tabs)/favorites'
        : currentSegment === 'profile'
          ? '/(tabs)/profile'
          : '/(tabs)';
    setPendingAction(action);
    router.push(action.kind === 'first_run' ? { pathname: '/account', params: { firstRun: '1' } } : '/account');
  }, [router, segments]);
  const markPromptSeen = useCallback(async () => {
    await AsyncStorage.setItem(ACCOUNT_PROMPT_SEEN_KEY, 'true');
    router.replace('/(tabs)');
  }, [router]);
  const finishAccountCreation = useCallback(async () => {
    const action = pendingAction;
    setEmailUpgradeCredentials(null);
    if (!action) return;
    setPendingAction(null);
    if (action.kind === 'first_run') { await markPromptSeen(); return; }
    // Auth state updates are asynchronous. Read Supabase's session here rather
    // than using the session captured by the render that opened the gate.
    const { data } = await supabase.auth.getSession();
    const freshSession = data.session;
    if (!freshSession || freshSession.user.is_anonymous) {
      restoreReturnRoute();
      return;
    }
    if (action.kind === 'favorite') {
      await addFavorite(freshSession.access_token, action.peakId);
      restoreReturnRoute();
      return;
    }
    await action.retry();
    restoreReturnRoute();
  }, [markPromptSeen, pendingAction, restoreReturnRoute]);
  const cancelAccountFlow = useCallback(async () => {
    const action = pendingAction;
    setEmailUpgradeCredentials(null);
    setPendingAction(null);
    if (action?.kind === 'first_run') { await markPromptSeen(); return; }
    if (action) restoreReturnRoute();
    else router.back();
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
  return <AccountGateContext.Provider value={{ pendingAction, requireAccount, finishAccountCreation, cancelAccountFlow, maybePromptFirstRun, emailUpgradeCredentials, setEmailUpgradeCredentials }}>{children}</AccountGateContext.Provider>;
}
export function useAccountGate(): AccountGateValue {
  const value = useContext(AccountGateContext);
  if (!value) throw new Error('useAccountGate must be used within AccountGateProvider');
  return value;
}
