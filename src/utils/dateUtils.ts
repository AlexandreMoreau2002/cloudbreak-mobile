export function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseISODate(dateISO: string): Date {
  const [year, month, day] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(dateISO: string, n: number): string {
  const date = parseISODate(dateISO);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

export function getDateParts(dateISO: string): { weekdayIndex: number; day: number; monthIndex: number } {
  const date = parseISODate(dateISO);
  return {
    weekdayIndex: date.getUTCDay(),
    day: date.getUTCDate(),
    monthIndex: date.getUTCMonth(),
  };
}
