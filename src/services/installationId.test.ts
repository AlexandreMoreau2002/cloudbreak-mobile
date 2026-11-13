import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { getInstallationId } from '@/services/installationId';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const INSTALLATION_ID = '550e8400-e29b-41d4-a716-446655440000';

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe('getInstallationId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Crypto.randomUUID).mockReturnValue(INSTALLATION_ID);
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
    jest.mocked(SecureStore.setItemAsync).mockResolvedValue();
  });

  it('conserve une valeur UUID v4 déjà stockée', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(INSTALLATION_ID);

    await expect(getInstallationId()).resolves.toBe(INSTALLATION_ID);

    expect(Crypto.randomUUID).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('partage une unique initialisation Keychain entre appels concurrents', async () => {
    const storedValue = deferred<string | null>();
    jest.mocked(SecureStore.getItemAsync).mockReturnValue(storedValue.promise);

    const first = getInstallationId();
    const second = getInstallationId();

    expect(first).toBe(second);
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(1);

    storedValue.resolve(null);

    await expect(first).resolves.toBe(INSTALLATION_ID);
    await expect(second).resolves.toBe(INSTALLATION_ID);
    expect(Crypto.randomUUID).toHaveBeenCalledTimes(1);
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
  });

  it('crée et stocke un UUID v4 quand Keychain est vide', async () => {
    await expect(getInstallationId()).resolves.toBe(INSTALLATION_ID);

    expect(Crypto.randomUUID).toHaveBeenCalledTimes(1);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'cloudbreak.installation-id.v1',
      INSTALLATION_ID,
    );
  });

  it.each([[''], ['not-a-uuid'], ['550e8400-e29b-31d4-a716-446655440000']])(
    'remplace une valeur Keychain invalide (%s)',
    async (storedValue) => {
      jest.mocked(SecureStore.getItemAsync).mockResolvedValue(storedValue);

      await expect(getInstallationId()).resolves.toBe(INSTALLATION_ID);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'cloudbreak.installation-id.v1',
        INSTALLATION_ID,
      );
    },
  );

  it('réinitialise l’initialisation après une erreur Keychain pour permettre un retry', async () => {
    const error = new Error('Keychain unavailable');
    jest.mocked(SecureStore.getItemAsync)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(null);

    await expect(getInstallationId()).rejects.toBe(error);
    await expect(getInstallationId()).resolves.toBe(INSTALLATION_ID);

    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(2);
    expect(Crypto.randomUUID).toHaveBeenCalledTimes(1);
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
  });

  it('propage une erreur Crypto sans écrire de valeur partielle', async () => {
    const error = new Error('Crypto unavailable');
    jest.mocked(Crypto.randomUUID).mockImplementation(() => {
      throw error;
    });

    await expect(getInstallationId()).rejects.toBe(error);

    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('propage une erreur Keychain à l’écriture', async () => {
    const error = new Error('Keychain write failed');
    jest.mocked(SecureStore.setItemAsync).mockRejectedValue(error);

    await expect(getInstallationId()).rejects.toBe(error);
  });
});
