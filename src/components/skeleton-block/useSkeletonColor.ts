/**
 * useSkeletonColor — couleur des blocs skeleton selon le theme.
 *
 * Contraste volontairement plus marque que colors.border : les blocs doivent
 * ressortir sur colors.surface ET colors.background (l'ancienne valeur #E9E4DA
 * etait identique a la bordure et se fondait dans le fond).
 */
import { useTheme } from '@/contexts/ThemeContext';

export function useSkeletonColor(): string {
  const { scheme } = useTheme();
  return scheme === 'dark' ? '#474747' : '#DCCEBB';
}
