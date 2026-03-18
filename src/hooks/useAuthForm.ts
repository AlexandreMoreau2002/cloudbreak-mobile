import i18n from '@/utils/i18n';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

type Mode = 'login' | 'signup';

export function useAuthForm() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('login');

  function toggleMode() {
    setMode(mode === 'login' ? 'signup' : 'login');
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
    setLoading(false);
    if (error) Alert.alert(i18n.t('auth.error'), error.message);
  }

  return { email, setEmail, password, setPassword, loading, mode, toggleMode, handleSubmit };
}
