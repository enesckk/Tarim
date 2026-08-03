/** Climate period helpers for NASA POWER climatology windows. */

export function clampHistoryYears(years: number, min = 3, max = 30, fallback = 10): number {
  if (!Number.isFinite(years)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(years)));
}

/**
 * Completed calendar years only (excludes current incomplete year).
 * Example: today in 2026 with years=10 → 2016-01-01 .. 2025-12-31
 */
export function resolveCompletedClimatologyPeriod(
  years: number,
  now = new Date(),
): { start: string; end: string; yearsUsed: number; startDate: Date; endDate: Date } {
  const yearsUsed = clampHistoryYears(years);
  const endYear = now.getUTCFullYear() - 1;
  const startYear = endYear - yearsUsed + 1;
  const startDate = new Date(Date.UTC(startYear, 0, 1));
  const endDate = new Date(Date.UTC(endYear, 11, 31));
  return {
    start: formatNasaDate(startDate),
    end: formatNasaDate(endDate),
    yearsUsed,
    startDate,
    endDate,
  };
}

export function formatNasaDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function parseNasaDateKey(key: string): Date | null {
  if (!/^\d{8}$/.test(key)) {
    return null;
  }
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(4, 6));
  const d = Number(key.slice(6, 8));
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
