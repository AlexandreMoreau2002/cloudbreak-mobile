import { AppState } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useSelectedPeak } from '@/contexts/SelectedPeakContext';
import { useTerrainGeofence } from '@/hooks/useTerrainGeofence';
import { syncTerrainGeofences } from '@/services/terrainGeofence';
import { getTerrainPref, rememberWatchedPeak } from '@/utils/terrainWatch';

jest.mock('@/contexts/SelectedPeakContext', () => ({ useSelectedPeak: jest.fn() }));
jest.mock('@/services/terrainGeofence', () => ({ syncTerrainGeofences: jest.fn() }));
jest.mock('@/utils/terrainWatch', () => ({
  getTerrainPref: jest.fn(),
  rememberWatchedPeak: jest.fn(),
}));

const peak = { id: 'p1', slug: 's', name: 'N', lat: 1, lng: 2, altitude: 3 };

beforeEach(() => {
  jest.clearAllMocks();
  (getTerrainPref as jest.Mock).mockResolvedValue(true);
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
