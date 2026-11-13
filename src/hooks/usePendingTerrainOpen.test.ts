import { renderHook, waitFor } from '@testing-library/react-native';

import { usePendingTerrainOpen } from '@/hooks/usePendingTerrainOpen';
import { consumePendingTerrainOpen } from '@/utils/terrainWatch';

jest.mock('@/utils/terrainWatch', () => ({ consumePendingTerrainOpen: jest.fn() }));

const consume = consumePendingTerrainOpen as jest.Mock;

beforeEach(() => jest.clearAllMocks());

it('ouvre le sheet quand une ouverture est en attente et que la prévision est prête', async () => {
  consume.mockResolvedValue(true);
  const onOpen = jest.fn();
  renderHook(() => usePendingTerrainOpen({ slug: 'mont-blanc', ready: true, onOpen }));
  await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
  expect(consume).toHaveBeenCalledWith('mont-blanc');
});

it("n'ouvre pas tant que la prévision n'est pas prête ou sans sommet", async () => {
  consume.mockResolvedValue(true);
  const onOpen = jest.fn();
  renderHook(() => usePendingTerrainOpen({ slug: 'mont-blanc', ready: false, onOpen }));
  renderHook(() => usePendingTerrainOpen({ slug: null, ready: true, onOpen }));
  await new Promise((r) => setTimeout(r, 0));
  expect(consume).not.toHaveBeenCalled();
  expect(onOpen).not.toHaveBeenCalled();
});

it("n'ouvre pas sans demande en attente", async () => {
  consume.mockResolvedValue(false);
  const onOpen = jest.fn();
  renderHook(() => usePendingTerrainOpen({ slug: 'mont-blanc', ready: true, onOpen }));
  await new Promise((r) => setTimeout(r, 0));
  expect(onOpen).not.toHaveBeenCalled();
});
