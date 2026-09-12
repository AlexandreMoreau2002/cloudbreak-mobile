import { useState } from 'react';
import { Alert } from 'react-native';
import i18n from '@/utils/i18n';
import { track } from '@/services/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SIMULATE_DELAY_MS } from '@/constants/devConfig';

type Mode = 'login' | 'signup';

export function useAuthForm() {
  useLanguage();
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('login');

  function toggleMode() {
    const nextMode = mode === 'login' ? 'signup' : 'login';
    track('auth_mode_toggled', { to: nextMode });
    setMode(nextMode);
  }

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert(i18n.t('auth.error'), i18n.t('auth.emptyFields'));
      return;
    }
    setLoading(true);
    const error = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password);
    if (SIMULATE_DELAY_MS > 0) await new Promise((resolve) => setTimeout(resolve, SIMULATE_DELAY_MS));
    setLoading(false);
    track('auth_submitted', error ? { mode, success: false, error_code: error.message } : { mode, success: true });
    if (error) Alert.alert(i18n.t('auth.error'), error.message);
  }

  return { email, setEmail, password, setPassword, loading, mode, toggleMode, handleSubmit };
}
