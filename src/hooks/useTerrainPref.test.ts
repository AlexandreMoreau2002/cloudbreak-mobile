import { AppState } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useTerrainPref } from '@/hooks/useTerrainPref';
import { getTerrainPref } from '@/utils/terrainWatch';

let mockFocusCallback: (() => void) | null = null;
jest.mock('expo-router/react-navigation', () => ({
  useFocusEffect: (cb: () => void) => {
    require('react').useEffect(() => {
      mockFocusCallback = cb;
      cb();
    }, [cb]);
  },
}));
jest.mock('@/utils/terrainWatch', () => ({ getTerrainPref: jest.fn() }));

const getPref = getTerrainPref as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockFocusCallback = null;
});

it('vaut false avant la fin de la lecture (pas de surveillance GPS prématurée)', async () => {
  getPref.mockResolvedValue(true);
  const { result } = renderHook(() => useTerrainPref());
  expect(result.current).toBe(false);
  await waitFor(() => expect(result.current).toBe(true));
});

it('reflète un cache local désactivé', async () => {
  getPref.mockResolvedValue(false);
  const { result } = renderHook(() => useTerrainPref());
  await waitFor(() => expect(getPref).toHaveBeenCalled());
  expect(result.current).toBe(false);
});

it('relit la préférence à chaque nouveau focus de l\'écran', async () => {
  getPref.mockResolvedValue(true);
  const { result } = renderHook(() => useTerrainPref());
  await waitFor(() => expect(getPref).toHaveBeenCalled());

  getPref.mockResolvedValue(false);
  await act(async () => {
    mockFocusCallback?.();
  });
  await waitFor(() => expect(result.current).toBe(false));
});

it('relit la préférence au retour au premier plan', async () => {
  let listener: (s: string) => void = () => undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, cb) => {
    listener = cb as (s: string) => void;
    return { remove: jest.fn() } as never;
  });
  getPref.mockResolvedValue(true);
  const { result } = renderHook(() => useTerrainPref());
  await waitFor(() => expect(getPref).toHaveBeenCalled());

  getPref.mockResolvedValue(false);
  await act(async () => {
    listener('active');
  });
  await waitFor(() => expect(result.current).toBe(false));
});
