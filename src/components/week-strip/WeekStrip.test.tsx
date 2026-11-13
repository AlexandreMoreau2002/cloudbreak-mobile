import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { WeekStrip } from '@/components/week-strip';
import type { WeekScores } from '@/hooks/useWeekScores';

let mockScheme: 'light' | 'dark' = 'light';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    scheme: mockScheme,
    colors: {
      background: '#EFE8DC',
      surface: '#F7F5F1',
      border: '#E9E4DA',
      accent: '#B28C6E',
      accentSecondary: '#D2BA9C',
      textPrimary: '#1A1A1A',
      textSecondary: '#5E5E5E',
      textDisabled: '#A0A0A0',
    },
  }),
}));

let mockLocale: 'fr' | 'en' = 'fr';
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: mockLocale, toggleLocale: jest.fn() }),
}));

jest.mock('@/utils/i18n', () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      'home.today': mockLocale === 'fr' ? "Aujourd'hui" : 'Today',
      'home.calendar.weekdaysShort.sun': mockLocale === 'fr' ? 'Dim.' : 'Sun.',
      'home.calendar.weekdaysShort.mon': mockLocale === 'fr' ? 'Lun.' : 'Mon.',
      'home.calendar.weekdaysShort.tue': mockLocale === 'fr' ? 'Mar.' : 'Tue.',
      'home.calendar.weekdaysShort.wed': mockLocale === 'fr' ? 'Mer.' : 'Wed.',
      'home.calendar.weekdaysShort.thu': mockLocale === 'fr' ? 'Jeu.' : 'Thu.',
      'home.calendar.weekdaysShort.fri': mockLocale === 'fr' ? 'Ven.' : 'Fri.',
      'home.calendar.weekdaysShort.sat': mockLocale === 'fr' ? 'Sam.' : 'Sat.',
      'home.calendar.monthsShort.jan': mockLocale === 'fr' ? 'Jan.' : 'Jan.',
      'home.calendar.monthsShort.feb': mockLocale === 'fr' ? 'Fév.' : 'Feb.',
      'home.calendar.monthsShort.mar': mockLocale === 'fr' ? 'Mar.' : 'Mar.',
      'home.calendar.monthsShort.apr': mockLocale === 'fr' ? 'Avr.' : 'Apr.',
      'home.calendar.monthsShort.may': mockLocale === 'fr' ? 'Mai' : 'May',
      'home.calendar.monthsShort.jun': mockLocale === 'fr' ? 'Juin' : 'Jun.',
      'home.calendar.monthsShort.jul': mockLocale === 'fr' ? 'Juil.' : 'Jul.',
      'home.calendar.monthsShort.aug': mockLocale === 'fr' ? 'Août' : 'Aug.',
      'home.calendar.monthsShort.sep': mockLocale === 'fr' ? 'Sep.' : 'Sep.',
      'home.calendar.monthsShort.oct': mockLocale === 'fr' ? 'Oct.' : 'Oct.',
      'home.calendar.monthsShort.nov': mockLocale === 'fr' ? 'Nov.' : 'Nov.',
      'home.calendar.monthsShort.dec': mockLocale === 'fr' ? 'Déc.' : 'Dec.',
    };
    return map[key] ?? key;
  },
}));

describe('WeekStrip', () => {
  beforeEach(() => {
    mockScheme = 'light';
    mockLocale = 'fr';
    jest.useFakeTimers().setSystemTime(new Date('2026-03-24T08:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sélectionne un jour au tap', () => {
    const onSelectDate = jest.fn();
    render(<WeekStrip selectedDate="2026-03-24" onSelectDate={onSelectDate} />);

    expect(screen.getByText("Aujourd'hui")).toBeTruthy();
    expect(screen.getByText('Mer.')).toBeTruthy();

    fireEvent.press(screen.getByText('Mer.'));
    expect(onSelectDate).toHaveBeenCalledWith('2026-03-25', 'tap');
  });

  it('permet de swiper vers le jour suivant', () => {
    const onSelectDate = jest.fn();
    render(<WeekStrip selectedDate="2026-03-24" onSelectDate={onSelectDate} />);

    fireEvent(screen.getByTestId('week-strip'), 'responderGrant', { nativeEvent: { pageX: 120 } });
    fireEvent(screen.getByTestId('week-strip'), 'responderRelease', { nativeEvent: { pageX: 40 } });

    expect(onSelectDate).toHaveBeenCalledWith('2026-03-25', 'swipe');
  });

  it('ignore les swipes trop courts', () => {
    const onSelectDate = jest.fn();
    render(<WeekStrip selectedDate="2026-03-24" onSelectDate={onSelectDate} />);

    fireEvent(screen.getByTestId('week-strip'), 'responderGrant', { nativeEvent: { pageX: 120 } });
    fireEvent(screen.getByTestId('week-strip'), 'responderRelease', { nativeEvent: { pageX: 108 } });

    expect(onSelectDate).not.toHaveBeenCalled();
  });

  it('permet de swiper vers le jour precedent', () => {
    const onSelectDate = jest.fn();
    render(<WeekStrip selectedDate="2026-03-25" onSelectDate={onSelectDate} />);

    fireEvent(screen.getByTestId('week-strip'), 'responderGrant', { nativeEvent: { pageX: 40 } });
    fireEvent(screen.getByTestId('week-strip'), 'responderRelease', { nativeEvent: { pageX: 140 } });

    expect(onSelectDate).toHaveBeenCalledWith('2026-03-24', 'swipe');
  });

  it('ignore un swipe qui sort de la plage', () => {
    const onSelectDate = jest.fn();
    render(<WeekStrip selectedDate="2026-03-24" onSelectDate={onSelectDate} />);

    fireEvent(screen.getByTestId('week-strip'), 'responderGrant', { nativeEvent: { pageX: 120 } });
    fireEvent(screen.getByTestId('week-strip'), 'responderRelease', { nativeEvent: { pageX: 180 } });

    expect(onSelectDate).not.toHaveBeenCalled();
  });

  it('ignore un responderRelease sans responderGrant', () => {
    const onSelectDate = jest.fn();
    render(<WeekStrip selectedDate="2026-03-24" onSelectDate={onSelectDate} />);

    fireEvent(screen.getByTestId('week-strip'), 'responderRelease', { nativeEvent: { pageX: 180 } });

    expect(onSelectDate).not.toHaveBeenCalled();
  });

  it('affiche le score coloré pour chaque jour quand dayScores est fourni', () => {
    const onSelectDate = jest.fn();
    const dayScores: WeekScores = {
      '2026-03-24': { score: 82, verdict: 'high', hour: 6 },
      '2026-03-25': { score: 44, verdict: 'medium', hour: 8 },
      '2026-03-26': { score: 12, verdict: 'low', hour: 16 },
    };

    render(<WeekStrip selectedDate="2026-03-24" onSelectDate={onSelectDate} dayScores={dayScores} />);

    expect(screen.getByTestId('day-score-2026-03-24')).toBeTruthy();
    expect(screen.getByText('82%')).toBeTruthy();
    expect(screen.getByTestId('day-score-2026-03-25')).toBeTruthy();
    expect(screen.getByText('44%')).toBeTruthy();
    expect(screen.getByTestId('day-score-2026-03-26')).toBeTruthy();
    expect(screen.getByText('12%')).toBeTruthy();
    // Jours sans score ne doivent pas avoir de testID day-score
    expect(screen.queryByTestId('day-score-2026-03-27')).toBeNull();
  });

  it("n'affiche pas de score si dayScores n'est pas fourni", () => {
    const onSelectDate = jest.fn();
    render(<WeekStrip selectedDate="2026-03-24" onSelectDate={onSelectDate} />);

    expect(screen.queryByTestId('day-score-2026-03-24')).toBeNull();
  });

  it('reste lisible en theme dark', () => {
    mockScheme = 'dark';
    const onSelectDate = jest.fn();
    render(<WeekStrip selectedDate="2026-03-24" onSelectDate={onSelectDate} />);

    expect(screen.getByText("Aujourd'hui")).toBeTruthy();
    expect(screen.getByText('24 Mar.')).toBeTruthy();
  });

  it('utilise la couleur de secours pour un verdict inconnu', () => {
    const onSelectDate = jest.fn();
    const dayScores: WeekScores = {
      '2026-03-24': { score: 61, verdict: 'mystery', hour: 6 },
    } as WeekScores;

    render(<WeekStrip selectedDate="2026-03-24" onSelectDate={onSelectDate} dayScores={dayScores} />);

    expect(screen.getByTestId('day-score-2026-03-24')).toBeTruthy();
    expect(screen.getByText('61%')).toBeTruthy();
  });

  it('affiche aussi le fallback inconnu pour un jour actif', () => {
    const onSelectDate = jest.fn();
    const dayScores: WeekScores = {
      '2026-03-24': { score: 50, verdict: 'mystery', hour: 6 },
    } as WeekScores;

    render(<WeekStrip selectedDate="2026-03-24" onSelectDate={onSelectDate} dayScores={dayScores} />);

    expect(screen.getByTestId('day-score-2026-03-24')).toBeTruthy();
  });

  it('utilise la couleur de secours pour un verdict inconnu sur un jour non actif', () => {
    const onSelectDate = jest.fn();
    const dayScores: WeekScores = {
      '2026-03-25': { score: 50, verdict: 'mystery', hour: 8 },
    } as WeekScores;

    render(<WeekStrip selectedDate="2026-03-24" onSelectDate={onSelectDate} dayScores={dayScores} />);

    expect(screen.getByTestId('day-score-2026-03-25')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('bascule Today en anglais quand la locale est en', () => {
    mockLocale = 'en';
    const onSelectDate = jest.fn();
    render(<WeekStrip selectedDate="2026-03-24" onSelectDate={onSelectDate} />);

    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('Wed.')).toBeTruthy();
    expect(screen.getByText('24 Mar.')).toBeTruthy();
  });
});
