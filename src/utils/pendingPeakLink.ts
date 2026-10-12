/**
 * pendingPeakLink — mémorise le slug d'un deep link `/sommet/{slug}` le temps que
 * l'utilisateur termine l'onboarding / la connexion. Donnée non sensible : AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'pendingPeakSlug';
const SLUG_PATTERN = /^[a-z0-9-]{1,100}$/;

export function isValidPeakSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

export async function setPendingPeakSlug(slug: string): Promise<boolean> {
  if (!isValidPeakSlug(slug)) return false;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, slug);
    return true;
  } catch {
    return false;
  }
}

export async function getPendingPeakSlug(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function clearPendingPeakSlug(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // best-effort
  }
}
