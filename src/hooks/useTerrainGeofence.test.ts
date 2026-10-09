import { AppState } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAuth } from '@/contexts/AuthContext';
import { fetchMe } from '@/services/api/user';
import { useSelectedPeak } from '@/contexts/SelectedPeakContext';
import { useTerrainGeofence } from '@/hooks/useTerrainGeofence';
import { syncTerrainGeofences } from '@/services/terrainGeofence';
import { getTerrainPref, rememberWatchedPeak, setTerrainPref } from '@/utils/terrainWatch';

jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/services/api/user', () => ({ fetchMe: jest.fn() }));
jest.mock('@/contexts/SelectedPeakContext', () => ({ useSelectedPeak: jest.fn() }));
jest.mock('@/services/terrainGeofence', () => ({ syncTerrainGeofences: jest.fn() }));
jest.mock('@/utils/terrainWatch', () => ({
  getTerrainPref: jest.fn(),
  rememberWatchedPeak: jest.fn(),
  setTerrainPref: jest.fn(),
}));

const peak = { id: 'p1', slug: 's', name: 'N', lat: 1, lng: 2, altitude: 3 };

beforeEach(() => {
  jest.clearAllMocks();
  (getTerrainPref as jest.Mock).mockResolvedValue(true);
  (useAuth as jest.Mock).mockReturnValue({ session: null, isAnonymous: false });
  (useSelectedPeak as jest.Mock).mockReturnValue({ selectedPeak: peak });
});

it('mémorise le sommet sélectionné puis synchronise le geofencing', async () => {
  renderHook(() => useTerrainGeofence());
  await waitFor(() => expect(syncTerrainGeofences).toHaveBeenCalledWith(true));
  expect(rememberWatchedPeak).toHaveBeenCalledWith(peak);
});

it("synchronise sans mémoriser quand aucun sommet n'est sélectionné", async () => {
  (useSelectedPeak as jest.Mock).mockReturnValue({ selectedPeak: null });
  renderHook(() => useTerrainGeofence());
  await waitFor(() => expect(syncTerrainGeofences).toHaveBeenCalled());
  expect(rememberWatchedPeak).not.toHaveBeenCalled();
});

it('resynchronise au retour au premier plan (permission changée dans les réglages)', async () => {
  let listener: (s: string) => void = () => {};
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, cb) => {
    listener = cb as (s: string) => void;
    return { remove: jest.fn() } as never;
  });
  renderHook(() => useTerrainGeofence());
  await waitFor(() => expect(syncTerrainGeofences).toHaveBeenCalledTimes(1));
  await act(async () => {
    listener('active');
  });
  await waitFor(() => expect(syncTerrainGeofences).toHaveBeenCalledTimes(2));
});

describe('préférence serveur', () => {
  const permanent = { session: { access_token: 'tok', user: { is_anonymous: false } }, isAnonymous: false };

  it('applique notif_terrain du serveur avant la synchronisation', async () => {
    (useAuth as jest.Mock).mockReturnValue(permanent);
    (fetchMe as jest.Mock).mockResolvedValue({ notif_terrain: false });
    renderHook(() => useTerrainGeofence());
    await waitFor(() => expect(syncTerrainGeofences).toHaveBeenCalled());
    expect(fetchMe).toHaveBeenCalledWith('tok');
    expect(setTerrainPref).toHaveBeenCalledWith(false);
    expect((setTerrainPref as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (syncTerrainGeofences as jest.Mock).mock.invocationCallOrder[0],
    );
  });

  it('retombe sur true si notif_terrain est absent', async () => {
    (useAuth as jest.Mock).mockReturnValue(permanent);
    (fetchMe as jest.Mock).mockResolvedValue({});
    renderHook(() => useTerrainGeofence());
    await waitFor(() => expect(setTerrainPref).toHaveBeenCalledWith(true));
  });

  it('ignore un échec réseau et synchronise quand même', async () => {
    (useAuth as jest.Mock).mockReturnValue(permanent);
    (fetchMe as jest.Mock).mockRejectedValue(new Error('network'));
    renderHook(() => useTerrainGeofence());
    await waitFor(() => expect(syncTerrainGeofences).toHaveBeenCalled());
    expect(setTerrainPref).not.toHaveBeenCalled();
  });

  it('ne contacte pas le serveur sans session ou en session anonyme', async () => {
    (useAuth as jest.Mock).mockReturnValue({ session: { access_token: 't', user: { is_anonymous: true } }, isAnonymous: true });
    renderHook(() => useTerrainGeofence());
    await waitFor(() => expect(syncTerrainGeofences).toHaveBeenCalled());
    expect(fetchMe).not.toHaveBeenCalled();
  });
});
