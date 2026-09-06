/**
 * secureSessionStorage — stockage de la session Supabase dans le Keychain iOS.
 *
 * Pourquoi : le JWT Supabase (access + refresh token) ne doit pas rester en clair
 * dans AsyncStorage. `expo-secure-store` le range dans le Keychain, mais impose une
 * limite de ~2048 octets par valeur — or une session Supabase sérialisée dépasse
 * souvent cette taille. Cet adaptateur découpe la valeur en fragments.
 *
 * Migration : au premier accès, si rien n'est trouvé dans le Keychain mais qu'une
 * valeur existe encore dans AsyncStorage (ancien stockage), elle est recopiée dans
 * le Keychain puis effacée d'AsyncStorage — aucune reconnexion forcée, et le token
 * en clair est purgé.
 *
 * Implémente l'interface `SupportedStorage` attendue par `createClient`.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEBUG } from '@/constants/devConfig';

// Marge volontaire sous la limite de 2048 octets (couvre les valeurs multi-octets).
const CHUNK_SIZE = 1536;

function chunkKey(key: string, index: number): string {
  return `${key}__chunk__${index}`;
}

async function readChunked(key: string): Promise<string | null> {
  const countRaw = await SecureStore.getItemAsync(key);
  if (countRaw == null) return null;
  const count = Number(countRaw);
  if (!Number.isInteger(count) || count <= 0) return null;

  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const part = await SecureStore.getItemAsync(chunkKey(key, i));
    if (part == null) {
      if (DEBUG) console.debug('[secureSessionStorage] fragment manquant', { key, i });
      return null;
    }
    parts.push(part);
  }
  return parts.join('');
}

async function clearChunked(key: string): Promise<void> {
  const countRaw = await SecureStore.getItemAsync(key);
  const count = countRaw == null ? 0 : Number(countRaw);
  if (Number.isInteger(count) && count > 0) {
    for (let i = 0; i < count; i += 1) {
      await SecureStore.deleteItemAsync(chunkKey(key, i));
    }
  }
  await SecureStore.deleteItemAsync(key);
}

async function writeChunked(key: string, value: string): Promise<void> {
  await clearChunked(key);
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  for (let i = 0; i < chunks.length; i += 1) {
    await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
  }
  await SecureStore.setItemAsync(key, String(chunks.length));
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const secure = await readChunked(key);
    if (secure != null) return secure;

    const legacy = await AsyncStorage.getItem(key);
    if (legacy != null) {
      if (DEBUG) console.debug('[secureSessionStorage] migration AsyncStorage → Keychain', { key });
      await writeChunked(key, legacy);
      await AsyncStorage.removeItem(key);
      return legacy;
    }
    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (DEBUG) console.debug('[secureSessionStorage] setItem', { key, size: value.length });
    await writeChunked(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (DEBUG) console.debug('[secureSessionStorage] removeItem', { key });
    await clearChunked(key);
    await AsyncStorage.removeItem(key);
  },
};
