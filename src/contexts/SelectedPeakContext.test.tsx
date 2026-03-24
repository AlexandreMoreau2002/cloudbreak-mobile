import type { Peak } from '@/services/mockData/types';
import { act, renderHook } from '@testing-library/react-native';
import { SelectedPeakProvider, useSelectedPeak } from '@/contexts/SelectedPeakContext';

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
  it('fournit_les_valeurs_par_defaut', () => {
    const { result } = renderHook(() => useSelectedPeak(), { wrapper });
    expect(result.current.selectedPeak).toBeNull();
    expect(result.current.selectedHour).toBe(6);
    // date ISO du jour (format YYYY-MM-DD)
    expect(result.current.selectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('met_a_jour_le_sommet_selectionne', () => {
    const { result } = renderHook(() => useSelectedPeak(), { wrapper });

    act(() => {
      result.current.setSelectedPeak(MOCK_PEAK);
    });

    expect(result.current.selectedPeak).toEqual(MOCK_PEAK);
  });

  it('met_a_jour_la_date', () => {
    const { result } = renderHook(() => useSelectedPeak(), { wrapper });

    act(() => {
      result.current.setSelectedDate('2026-04-01');
    });

    expect(result.current.selectedDate).toBe('2026-04-01');
  });

  it('throw_si_utilise_hors_provider', () => {
    // Suppress the expected error output from React/testing-library
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSelectedPeak())).toThrow(
      'useSelectedPeak must be used within SelectedPeakProvider',
    );
    consoleSpy.mockRestore();
  });
});
