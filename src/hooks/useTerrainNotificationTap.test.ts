import * as Notifications from 'expo-notifications';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useTerrainNotificationTap } from '@/hooks/useTerrainNotificationTap';
import { consumePendingTerrainOpen, setPendingTerrainOpen } from '@/utils/terrainWatch';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('expo-notifications', () => ({ useLastNotificationResponse: jest.fn() }));
jest.mock('@/utils/pendingPeakLink', () => ({
  isValidPeakSlug: (slug: string) => /^[a-z0-9-]{1,100}$/.test(slug),
}));
jest.mock('@/utils/terrainWatch', () => ({
  consumePendingTerrainOpen: jest.fn(),
  setPendingTerrainOpen: jest.fn(),
}));

const useResponse = Notifications.useLastNotificationResponse as jest.Mock;
const response = (data: object, identifier = 'n1') => ({
  notification: { request: { identifier, content: { data } } },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockReplace.mockReset();
});

it("mémorise l'ouverture du sheet puis passe par la route de deep link du sommet", async () => {
  useResponse.mockReturnValue(response({ type: 'terrain', slug: 'mont-blanc' }));
  renderHook(() => useTerrainNotificationTap());
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/sommet/mont-blanc'));
  expect(setPendingTerrainOpen).toHaveBeenCalledWith('mont-blanc');
  expect((setPendingTerrainOpen as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
    mockReplace.mock.invocationCallOrder[0],
  );
});

it("efface l'ouverture en attente si la navigation échoue", async () => {
  mockReplace.mockImplementation(() => {
    throw new Error('nav');
  });
  useResponse.mockReturnValue(response({ type: 'terrain', slug: 'mont-blanc' }));
  renderHook(() => useTerrainNotificationTap());
  await waitFor(() => expect(consumePendingTerrainOpen).toHaveBeenCalledWith('mont-blanc'));
});

it.each([
  ['aucune réponse', null],
  ['autre type de notification', response({ type: 'other', slug: 'x' })],
  ['slug manquant', response({ type: 'terrain' })],
  ['slug invalide', response({ type: 'terrain', slug: '../etc' })],
])('ignore : %s', async (_l, value) => {
  useResponse.mockReturnValue(value);
  renderHook(() => useTerrainNotificationTap());
  await new Promise((r) => setTimeout(r, 0));
  expect(mockReplace).not.toHaveBeenCalled();
  expect(setPendingTerrainOpen).not.toHaveBeenCalled();
});

it('ne traite pas deux fois la même notification', async () => {
  useResponse.mockReturnValue(response({ type: 'terrain', slug: 'a' }));
  const { rerender } = renderHook(() => useTerrainNotificationTap());
  await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
  rerender({});
  await new Promise((r) => setTimeout(r, 0));
  expect(mockReplace).toHaveBeenCalledTimes(1);
});
