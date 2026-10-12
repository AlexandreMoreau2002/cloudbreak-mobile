import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearPendingPeakSlug,
  getPendingPeakSlug,
  isValidPeakSlug,
  setPendingPeakSlug,
} from '@/utils/pendingPeakLink';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

beforeEach(() => jest.clearAllMocks());

describe('isValidPeakSlug', () => {
  it.each(['mont-blanc', 'aiguille-du-midi', 'puy-de-dome2'])('accepte %s', (slug) => {
    expect(isValidPeakSlug(slug)).toBe(true);
  });

  it.each(['', 'Mont Blanc', '../etc', 'a/b', 'a?b=1', 'x'.repeat(101)])('refuse %j', (slug) => {
    expect(isValidPeakSlug(slug)).toBe(false);
  });
});

describe('pending slug storage', () => {
  it('mémorise un slug valide', async () => {
    await expect(setPendingPeakSlug('mont-blanc')).resolves.toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith('pendingPeakSlug', 'mont-blanc');
  });

  it('ignore un slug invalide sans rien écrire', async () => {
    await expect(setPendingPeakSlug('../x')).resolves.toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("renvoie false si l'écriture échoue", async () => {
    storage.setItem.mockRejectedValueOnce(new Error('boom'));
    await expect(setPendingPeakSlug('mont-blanc')).resolves.toBe(false);
  });

  it('relit le slug mémorisé, null sinon ou si le stockage échoue', async () => {
    storage.getItem.mockResolvedValueOnce('mont-blanc');
    await expect(getPendingPeakSlug()).resolves.toBe('mont-blanc');
    storage.getItem.mockResolvedValueOnce(null);
    await expect(getPendingPeakSlug()).resolves.toBeNull();
    storage.getItem.mockRejectedValueOnce(new Error('boom'));
    await expect(getPendingPeakSlug()).resolves.toBeNull();
  });

  it('supprime le slug', async () => {
    await clearPendingPeakSlug();
    expect(storage.removeItem).toHaveBeenCalledWith('pendingPeakSlug');
  });

  it('ignore une erreur de suppression', async () => {
    storage.removeItem.mockRejectedValueOnce(new Error('boom'));
    await expect(clearPendingPeakSlug()).resolves.toBeUndefined();
  });
});
