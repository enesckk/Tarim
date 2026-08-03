import type { ParcelQuery } from '../types/parcel.types.js';

/**
 * Trims and Turkish-locale lowercases text for comparison without mutating display names.
 */
export function normalizeLookupKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
}

export function buildParcelCacheKey(query: ParcelQuery): string {
  return [
    normalizeLookupKey(query.province),
    normalizeLookupKey(query.district),
    normalizeLookupKey(query.neighborhood),
    normalizeLookupKey(query.block),
    normalizeLookupKey(query.parcel),
  ].join('|');
}

/**
 * Parses Turkish-formatted area strings such as "21.913,16" into numbers.
 */
export function parseTurkishArea(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // "21.913,16" → remove thousand separators, convert decimal comma
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function namesMatch(left: string, right: string): boolean {
  return normalizeLookupKey(left) === normalizeLookupKey(right);
}

export class ParcelNormalizationService {
  toCacheKey(query: ParcelQuery): string {
    return buildParcelCacheKey(query);
  }

  parseArea(value: unknown): number | null {
    return parseTurkishArea(value);
  }

  matchesName(candidate: string, expected: string): boolean {
    return namesMatch(candidate, expected);
  }
}
