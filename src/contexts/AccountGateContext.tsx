import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addFavorite } from '@/services/api/user';

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
  const { session } = useAuth();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [emailUpgradeCredentials, setEmailUpgradeCredentials] = useState<EmailUpgradeCredentials | null>(null);
  const firstRunPromptChecked = useRef(false);
  const requireAccount = useCallback((action: PendingAction) => {
    setPendingAction(action);
    router.push(action.kind === 'first_run' ? { pathname: '/account', params: { firstRun: '1' } } : '/account');
  }, [router]);
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
    if (action.kind === 'favorite') {
      if (session && !session.user.is_anonymous) await addFavorite(session.access_token, action.peakId);
      router.back();
      return;
    }
    await action.retry();
    router.back();
  }, [markPromptSeen, pendingAction, router, session]);
  const cancelAccountFlow = useCallback(async () => {
    const action = pendingAction;
    setEmailUpgradeCredentials(null);
    setPendingAction(null);
    if (action?.kind === 'first_run') { await markPromptSeen(); return; }
    router.back();
  }, [markPromptSeen, pendingAction, router]);
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
