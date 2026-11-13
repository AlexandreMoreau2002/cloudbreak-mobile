import type { Peak } from '@/services/mockData/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { SelectedPeakProvider, useSelectedPeak } from '@/contexts/SelectedPeakContext';

const asyncStorageStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(asyncStorageStore[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    asyncStorageStore[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete asyncStorageStore[key];
    return Promise.resolve();
  }),
}));

const MOCK_PEAK: Peak = {
  id: 'peak-1',
  name: 'Mont Blanc',
  slug: 'mont-blanc',
  lat: 45.8326,
  lng: 6.8652,
  altitude: 4808,
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SelectedPeakProvider>{children}</SelectedPeakProvider>
);

describe('SelectedPeakContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(asyncStorageStore).forEach((key) => delete asyncStorageStore[key]);
  });

  it('fournit_les_valeurs_par_defaut', async () => {
    const { result } = renderHook(() => useSelectedPeak(), { wrapper });

    await waitFor(() => {
      expect(result.current.selectedPeak).toBeNull();
    });
    expect(result.current.selectedHour).toBe(6);
    expect(result.current.selectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('hydrate_les_valeurs_depuis_AsyncStorage', async () => {
    asyncStorageStore.selectedPeak = JSON.stringify({
      selectedPeak: MOCK_PEAK,
      selectedDate: '2026-04-01',
      selectedHour: 8,
    });

    const { result } = renderHook(() => useSelectedPeak(), { wrapper });

    await waitFor(() => {
      expect(result.current.selectedPeak).toEqual(MOCK_PEAK);
    });
    expect(result.current.selectedDate).toBe('2026-04-01');
    expect(result.current.selectedHour).toBe(8);
  });

  it("ignore_un_payload_vide_sans_modifier_les_defauts", async () => {
    asyncStorageStore.selectedPeak = JSON.stringify({});

    const { result } = renderHook(() => useSelectedPeak(), { wrapper });

    await waitFor(() => {
      expect(result.current.selectedPeak).toBeNull();
    });
    expect(result.current.selectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.selectedHour).toBe(6);
  });

  it('ignore_les_erreurs_de_stockage_et_retourne_aux_defauts', async () => {
    const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockedAsyncStorage.getItem.mockRejectedValueOnce(new Error('storage unavailable'));

    const { result } = renderHook(() => useSelectedPeak(), { wrapper });

    await waitFor(() => {
      expect(result.current.selectedPeak).toBeNull();
    });
    expect(result.current.selectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.selectedHour).toBe(6);
  });

  it('ne_met_pas_a_jour_l_etat_si_le_provider_est_demonté_pendant_l_hydratation', async () => {
    let resolveGetItem: (value: string | null) => void = () => undefined;
    const pending = new Promise<string | null>((resolve) => {
      resolveGetItem = resolve;
    });

    const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockedAsyncStorage.getItem.mockReturnValueOnce(pending);

    const { unmount } = renderHook(() => useSelectedPeak(), { wrapper });
    unmount();

    await act(async () => {
      resolveGetItem(null);
      await pending;
    });
  });

  it('persiste_le_sommet_selectionne', async () => {
    const { result } = renderHook(() => useSelectedPeak(), { wrapper });

    await waitFor(() => {
      expect(result.current.selectedPeak).toBeNull();
    });

    act(() => {
      result.current.setSelectedPeak(MOCK_PEAK);
      result.current.setSelectedDate('2026-04-01');
      result.current.setSelectedHour(8);
    });

    await waitFor(() => {
      expect(asyncStorageStore.selectedPeak).toContain('mont-blanc');
    });
  });

  it('efface_la_persistence_si_le_sommet_est_retiré', async () => {
    asyncStorageStore.selectedPeak = JSON.stringify({
      selectedPeak: MOCK_PEAK,
      selectedDate: '2026-04-01',
      selectedHour: 8,
    });

    const { result } = renderHook(() => useSelectedPeak(), { wrapper });

    await waitFor(() => {
      expect(result.current.selectedPeak).toEqual(MOCK_PEAK);
    });

    act(() => {
      result.current.setSelectedPeak(null);
    });

    await waitFor(() => {
      expect(asyncStorageStore.selectedPeak).toBeUndefined();
    });
  });

  it('throw_si_utilise_hors_provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSelectedPeak())).toThrow(
      'useSelectedPeak must be used within SelectedPeakProvider',
    );
    consoleSpy.mockRestore();
  });
});
