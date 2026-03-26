/**
 * SelectedPeakContext — stocke le sommet sélectionné, la date et l'heure.
 *
 * Usage :
 *   const { selectedPeak, setSelectedPeak, selectedDate } = useSelectedPeak();
 */
import type { Peak } from '@/services/mockData/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useEffect, useContext, useState, type ReactNode } from 'react';

interface SelectedPeakContextValue {
  selectedPeak: Peak | null;
  selectedDate: string;
  selectedHour: number;
  setSelectedPeak: (peak: Peak | null) => void;
  setSelectedDate: (date: string) => void;
  setSelectedHour: (hour: number) => void;
}

const SelectedPeakContext = createContext<SelectedPeakContextValue | null>(null);
const STORAGE_KEY = 'selectedPeak';

interface SelectedPeakStorage {
  selectedPeak: Peak | null;
  selectedDate: string;
  selectedHour: number;
}

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SelectedPeakProvider({ children }: { children: ReactNode }) {
  const [selectedPeak, setSelectedPeak] = useState<Peak | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());
  const [selectedHour, setSelectedHour] = useState<number>(6);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function hydrateSelection() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw || !mounted) return;

        const parsed = JSON.parse(raw) as Partial<SelectedPeakStorage>;
        if (parsed.selectedPeak !== undefined) setSelectedPeak(parsed.selectedPeak);
        if (typeof parsed.selectedDate === 'string') setSelectedDate(parsed.selectedDate);
        if (typeof parsed.selectedHour === 'number') setSelectedHour(parsed.selectedHour);
      } catch {
        // Storage is best-effort; fall back to defaults if it is unavailable.
      } finally {
        if (mounted) setHydrated(true);
      }
    }

    void hydrateSelection();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!selectedPeak) {
      void AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }

    const payload: SelectedPeakStorage = {
      selectedPeak,
      selectedDate,
      selectedHour,
    };

    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [hydrated, selectedPeak, selectedDate, selectedHour]);

  if (!hydrated) {
    return null;
  }

  return (
    <SelectedPeakContext.Provider
      value={{ selectedPeak, selectedDate, selectedHour, setSelectedPeak, setSelectedDate, setSelectedHour }}
    >
      {children}
    </SelectedPeakContext.Provider>
  );
}

export function useSelectedPeak(): SelectedPeakContextValue {
  const ctx = useContext(SelectedPeakContext);
  if (!ctx) throw new Error('useSelectedPeak must be used within SelectedPeakProvider');
  return ctx;
}
