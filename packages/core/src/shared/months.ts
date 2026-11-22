/** Month strings use the format `YYYY-MM`. A month index is `year * 12 + (month - 1)`. */
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Returns the month index, or null if the string is not a valid `YYYY-MM`. */
export function monthToIndex(value: string): number | null {
  const match = MONTH_PATTERN.exec(value);
  if (!match) return null;
  return Number(match[1]) * 12 + Number(match[2]) - 1;
}

export function indexToMonth(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

export function calendarYearOfIndex(index: number): number {
  return Math.floor(index / 12);
}

/** True for the first month (January) of a calendar year. */
export function isJanuaryIndex(index: number): boolean {
  return index % 12 === 0;
}
