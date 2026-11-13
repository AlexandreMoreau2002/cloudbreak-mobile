import { addDays, getDateParts, getTodayISO, parseISODate } from '@/utils/dateUtils';

describe('dateUtils', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-28T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retourne la date du jour au format ISO', () => {
    expect(getTodayISO()).toBe('2026-03-28');
  });

  it('parse une date ISO en UTC', () => {
    const date = parseISODate('2026-03-28');
    expect(date.toISOString()).toBe('2026-03-28T00:00:00.000Z');
  });

  it('ajoute correctement des jours', () => {
    expect(addDays('2026-03-28', 3)).toBe('2026-03-31');
  });

  it('extrait les parties de date attendues', () => {
    expect(getDateParts('2026-03-28')).toEqual({
      weekdayIndex: 6,
      day: 28,
      monthIndex: 2,
    });
  });
});
