import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const INSTALLATION_ID_KEY = 'cloudbreak.installation-id.v1';
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let initializationPromise: Promise<string> | undefined;

async function readOrCreateInstallationId(): Promise<string> {
  const current = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (current && UUID_V4_PATTERN.test(current)) return current;

  const created = Crypto.randomUUID();
  await SecureStore.setItemAsync(INSTALLATION_ID_KEY, created);
  return created;
}

export function getInstallationId(): Promise<string> {
  if (initializationPromise) return initializationPromise;

  const request = readOrCreateInstallationId();
  initializationPromise = request;
  request.then(
    () => {
      initializationPromise = undefined;
    },
    () => {
      initializationPromise = undefined;
    },
  );
  return request;
}
