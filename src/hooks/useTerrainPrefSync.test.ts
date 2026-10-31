import { renderHook, waitFor } from '@testing-library/react-native';

import { useAuth } from '@/contexts/AuthContext';
import { fetchMe } from '@/services/api/user';
import { setTerrainPref } from '@/utils/terrainWatch';
import { useTerrainPrefSync } from '@/hooks/useTerrainPrefSync';

jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/services/api/user', () => ({ fetchMe: jest.fn() }));
jest.mock('@/utils/terrainWatch', () => ({ setTerrainPref: jest.fn() }));

const permanent = {
  session: { access_token: 'tok', user: { id: 'u1', is_anonymous: false } },
  isAnonymous: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  (useAuth as jest.Mock).mockReturnValue(permanent);
});

it('applique notif_terrain du serveur dans le stockage local', async () => {
  (fetchMe as jest.Mock).mockResolvedValue({ notif_terrain: false });
  renderHook(() => useTerrainPrefSync());
  await waitFor(() => expect(setTerrainPref).toHaveBeenCalledWith(false));
  expect(fetchMe).toHaveBeenCalledWith('tok');
});

it('ne rappelle pas fetchMe quand le JWT est rafraîchi pour le même utilisateur', async () => {
  (fetchMe as jest.Mock).mockResolvedValue({ notif_terrain: true });
  const { rerender } = renderHook(() => useTerrainPrefSync());
  await waitFor(() => expect(fetchMe).toHaveBeenCalledTimes(1));
  (useAuth as jest.Mock).mockReturnValue({
    session: { access_token: 'tok-2', user: { id: 'u1', is_anonymous: false } },
    isAnonymous: false,
  });
  rerender({});
  await new Promise((r) => setTimeout(r, 0));
  expect(fetchMe).toHaveBeenCalledTimes(1);
});

it("rappelle fetchMe avec le jeton courant quand l'utilisateur change", async () => {
  (fetchMe as jest.Mock).mockResolvedValue({ notif_terrain: true });
  const { rerender } = renderHook(() => useTerrainPrefSync());
  await waitFor(() => expect(fetchMe).toHaveBeenCalledTimes(1));
  (useAuth as jest.Mock).mockReturnValue({
    session: { access_token: 'tok-b', user: { id: 'u2', is_anonymous: false } },
    isAnonymous: false,
  });
  rerender({});
  await waitFor(() => expect(fetchMe).toHaveBeenCalledTimes(2));
  expect(fetchMe).toHaveBeenLastCalledWith('tok-b');
});

it('retombe sur true si notif_terrain est absent', async () => {
  (fetchMe as jest.Mock).mockResolvedValue({});
  renderHook(() => useTerrainPrefSync());
  await waitFor(() => expect(setTerrainPref).toHaveBeenCalledWith(true));
});

it('ignore un échec réseau', async () => {
  (fetchMe as jest.Mock).mockRejectedValue(new Error('network'));
  renderHook(() => useTerrainPrefSync());
  await waitFor(() => expect(fetchMe).toHaveBeenCalled());
  expect(setTerrainPref).not.toHaveBeenCalled();
});

it('ne contacte pas le serveur sans session ou en session anonyme', async () => {
  (useAuth as jest.Mock).mockReturnValue({
    session: { access_token: 't', user: { is_anonymous: true } },
    isAnonymous: true,
  });
  renderHook(() => useTerrainPrefSync());
  await new Promise((r) => setTimeout(r, 0));
  expect(fetchMe).not.toHaveBeenCalled();
});
