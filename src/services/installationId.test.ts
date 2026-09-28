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

  it('propage une erreur Keychain sans générer de nouvel identifiant', async () => {
    const error = new Error('Keychain unavailable');
    jest.mocked(SecureStore.getItemAsync).mockRejectedValue(error);

    await expect(getInstallationId()).rejects.toBe(error);

    expect(Crypto.randomUUID).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
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
