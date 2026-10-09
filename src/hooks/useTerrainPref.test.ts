import { renderHook, waitFor } from '@testing-library/react-native';

import { useTerrainPref } from '@/hooks/useTerrainPref';
import { getTerrainPref } from '@/utils/terrainWatch';

jest.mock('@/utils/terrainWatch', () => ({ getTerrainPref: jest.fn() }));

it('vaut true avant lecture puis reflète le cache local', async () => {
  (getTerrainPref as jest.Mock).mockResolvedValue(false);
  const { result } = renderHook(() => useTerrainPref());
  expect(result.current).toBe(true);
  await waitFor(() => expect(result.current).toBe(false));
});
