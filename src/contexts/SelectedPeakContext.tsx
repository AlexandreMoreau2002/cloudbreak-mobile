/**
 * SelectedPeakContext — stocke le sommet sélectionné, la date et l'heure.
 *
 * Usage :
 *   const { selectedPeak, setSelectedPeak, selectedDate } = useSelectedPeak();
 */
import type { Peak } from '@/services/mockData/types';
import { createContext, useContext, useState } from 'react';

interface SelectedPeakContextValue {
  selectedPeak: Peak | null;
  selectedDate: string;
  selectedHour: number;
  setSelectedPeak: (peak: Peak | null) => void;
  setSelectedDate: (date: string) => void;
  setSelectedHour: (hour: number) => void;
}

const SelectedPeakContext = createContext<SelectedPeakContextValue | null>(null);

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SelectedPeakProvider({ children }: { children: React.ReactNode }) {
  const [selectedPeak, setSelectedPeak] = useState<Peak | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());
  const [selectedHour, setSelectedHour] = useState<number>(6);

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
