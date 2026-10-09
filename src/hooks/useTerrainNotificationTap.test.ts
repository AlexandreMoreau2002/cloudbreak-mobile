import * as Notifications from 'expo-notifications';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useSelectedPeak } from '@/contexts/SelectedPeakContext';
import { fetchPeakBySlug } from '@/services/api/peaks';
import { setPendingTerrainOpen } from '@/utils/terrainWatch';
import { useTerrainNotificationTap } from '@/hooks/useTerrainNotificationTap';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('expo-notifications', () => ({ useLastNotificationResponse: jest.fn() }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/contexts/SelectedPeakContext', () => ({ useSelectedPeak: jest.fn() }));
jest.mock('@/services/api/peaks', () => ({ fetchPeakBySlug: jest.fn() }));
jest.mock('@/utils/terrainWatch', () => ({ setPendingTerrainOpen: jest.fn() }));

const useResponse = Notifications.useLastNotificationResponse as jest.Mock;
const mockSetSelectedPeak = jest.fn();
const peak = { id: 'p1', slug: 'mont-blanc', name: 'Mont Blanc', lat: 1, lng: 2, altitude: 3 };
const response = (data: object, identifier = 'n1') => ({
  notification: { request: { identifier, content: { data } } },
});

beforeEach(() => {
  jest.clearAllMocks();
  (useAuth as jest.Mock).mockReturnValue({ session: { access_token: 'tok' } });
  (useSelectedPeak as jest.Mock).mockReturnValue({ setSelectedPeak: mockSetSelectedPeak });
  (fetchPeakBySlug as jest.Mock).mockResolvedValue(peak);
});

it("sélectionne le sommet, mémorise l'ouverture du sheet puis ouvre l'accueil", async () => {
  useResponse.mockReturnValue(response({ type: 'terrain', slug: 'mont-blanc' }));
  renderHook(() => useTerrainNotificationTap());
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
  expect(setPendingTerrainOpen).toHaveBeenCalledWith('mont-blanc');
  expect(fetchPeakBySlug).toHaveBeenCalledWith('tok', 'mont-blanc');
  expect(mockSetSelectedPeak).toHaveBeenCalledWith(peak);
});

it("ouvre quand même l'accueil si le sommet est introuvable", async () => {
  (fetchPeakBySlug as jest.Mock).mockRejectedValue(new Error('network'));
  useResponse.mockReturnValue(response({ type: 'terrain', slug: 'mont-blanc' }));
  renderHook(() => useTerrainNotificationTap());
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
  expect(mockSetSelectedPeak).not.toHaveBeenCalled();
});

it('attend la session avant de traiter la notification', async () => {
  (useAuth as jest.Mock).mockReturnValue({ session: null });
  useResponse.mockReturnValue(response({ type: 'terrain', slug: 'mont-blanc' }));
  renderHook(() => useTerrainNotificationTap());
  await new Promise((r) => setTimeout(r, 0));
  expect(mockReplace).not.toHaveBeenCalled();
});

it.each([
  ['aucune réponse', null],
  ['autre type de notification', response({ type: 'other', slug: 'x' })],
  ['slug manquant', response({ type: 'terrain' })],
])('ignore : %s', async (_l, value) => {
  useResponse.mockReturnValue(value);
  renderHook(() => useTerrainNotificationTap());
  await new Promise((r) => setTimeout(r, 0));
  expect(mockReplace).not.toHaveBeenCalled();
});

it('ne traite pas deux fois la même notification', async () => {
  useResponse.mockReturnValue(response({ type: 'terrain', slug: 'a' }));
  const { rerender } = renderHook(() => useTerrainNotificationTap());
  await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
  rerender({});
  await new Promise((r) => setTimeout(r, 0));
  expect(mockReplace).toHaveBeenCalledTimes(1);
});
