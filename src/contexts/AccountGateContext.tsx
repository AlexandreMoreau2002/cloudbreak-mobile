import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addFavorite } from '@/services/api/user';

const ACCOUNT_PROMPT_SEEN_KEY = 'hasSeenAccountPrompt';
export type PendingAction =
  | { kind: 'favorite'; peakId: string }
  | { kind: 'quota'; retry: () => void | Promise<void> }
  | { kind: 'first_run' };
interface AccountGateValue {
  pendingAction: PendingAction | null;
  requireAccount: (action: PendingAction) => void;
  finishAccountCreation: () => Promise<void>;
  cancelAccountFlow: () => Promise<void>;
}
const AccountGateContext = createContext<AccountGateValue | null>(null);

export function AccountGateProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session } = useAuth();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
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
    setPendingAction(null);
    if (action?.kind === 'first_run') { await markPromptSeen(); return; }
    router.back();
  }, [markPromptSeen, pendingAction, router]);
  return <AccountGateContext.Provider value={{ pendingAction, requireAccount, finishAccountCreation, cancelAccountFlow }}>{children}</AccountGateContext.Provider>;
}
export function useAccountGate(): AccountGateValue {
  const value = useContext(AccountGateContext);
  if (!value) throw new Error('useAccountGate must be used within AccountGateProvider');
  return value;
}
