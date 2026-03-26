import React from 'react';
import { WeekStrip } from '@/components/WeekStrip';
import type { WeekScores } from '@/hooks/useWeekScores';
import { fireEvent, render, screen } from '@testing-library/react-native';

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

describe('WeekStrip', () => {
  beforeEach(() => {
    mockScheme = 'light';
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
    expect(onSelectDate).toHaveBeenCalledWith('2026-03-25');
  });

  it('permet de swiper vers le jour suivant', () => {
    const onSelectDate = jest.fn();
    render(<WeekStrip selectedDate="2026-03-24" onSelectDate={onSelectDate} />);

    fireEvent(screen.getByTestId('week-strip'), 'responderGrant', { nativeEvent: { pageX: 120 } });
    fireEvent(screen.getByTestId('week-strip'), 'responderRelease', { nativeEvent: { pageX: 40 } });

    expect(onSelectDate).toHaveBeenCalledWith('2026-03-25');
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

    expect(onSelectDate).toHaveBeenCalledWith('2026-03-24');
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
      '2026-03-24': { score: 82, verdict: 'high' },
      '2026-03-25': { score: 44, verdict: 'medium' },
      '2026-03-26': { score: 12, verdict: 'low' },
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
      '2026-03-24': { score: 61, verdict: 'mystery' },
    } as WeekScores;

    render(<WeekStrip selectedDate="2026-03-24" onSelectDate={onSelectDate} dayScores={dayScores} />);

    expect(screen.getByTestId('day-score-2026-03-24')).toBeTruthy();
    expect(screen.getByTestId('day-dot-2026-03-24')).toBeTruthy();
    expect(screen.getByText('61%')).toBeTruthy();
  });

  it('affiche aussi le fallback inconnu pour un jour actif', () => {
    const onSelectDate = jest.fn();
    const dayScores: WeekScores = {
      '2026-03-24': { score: 50, verdict: 'mystery' },
    } as WeekScores;

    render(<WeekStrip selectedDate="2026-03-24" onSelectDate={onSelectDate} dayScores={dayScores} />);

    expect(screen.getByTestId('day-score-2026-03-24')).toBeTruthy();
    expect(screen.getByTestId('day-dot-2026-03-24')).toBeTruthy();
  });

  it('utilise la couleur de secours pour un verdict inconnu sur un jour non actif', () => {
    const onSelectDate = jest.fn();
    const dayScores: WeekScores = {
      '2026-03-25': { score: 50, verdict: 'mystery' },
    } as WeekScores;

    render(<WeekStrip selectedDate="2026-03-24" onSelectDate={onSelectDate} dayScores={dayScores} />);

    expect(screen.getByTestId('day-score-2026-03-25')).toBeTruthy();
    expect(screen.getByTestId('day-dot-2026-03-25')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
  });
});
