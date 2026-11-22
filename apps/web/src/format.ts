const eur = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 });

/** Today's date as `YYYY-MM-DD` in the local time zone (`toISOString` would give the UTC date, off by one around midnight). */
export function todayLocal(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export const formatEur = (v: number): string => eur.format(Math.round(v));
export const formatNumber = (v: number): string => (Number.isFinite(v) ? num.format(v) : '');

/** Parses de-DE input ("1.234,5") into a number; returns NaN if invalid. */
export function parseNumber(text: string): number {
  const t = text.trim().replace(/\s/g, '');
  if (t === '' || !/^-?[\d.]*,?\d*$/.test(t)) return NaN;
  const n = Number(t.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

const eur2 = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const formatEur2 = (v: number): string => eur2.format(v);

/** `66.6667` -> `66 Jahre, 8 Monate`; whole ages as `67 Jahre`. */
export function formatAge(age: number): string {
  const totalMonths = Math.round(age * 12);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return months === 0 ? `${years} Jahre` : `${years} Jahre, ${months} Monate`;
}

/** `2028-04` -> `04/2028`. */
export function formatMonth(month: string): string {
  return `${month.slice(5, 7)}/${month.slice(0, 4)}`;
}
