import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const INSTALLATION_ID_KEY = 'cloudbreak.installation-id.v1';
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getInstallationId(): Promise<string> {
  const current = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (current && UUID_V4_PATTERN.test(current)) return current;

  const created = Crypto.randomUUID();
  await SecureStore.setItemAsync(INSTALLATION_ID_KEY, created);
  return created;
}
