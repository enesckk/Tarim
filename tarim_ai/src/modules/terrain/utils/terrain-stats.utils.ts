/** Deterministic numeric helpers for DEM / slope / ruggedness. */

export function isValidElevation(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function filterValid(values: Array<number | null | undefined>): number[] {
  return values.filter(isValidElevation);
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (p <= 0) return sorted[0];
  if (p >= 100) return sorted[sorted.length - 1];
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function populationStdDev(values: number[]): number | null {
  if (values.length === 0) return null;
  const m = mean(values)!;
  const variance =
    values.reduce((sum, value) => sum + (value - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** FNV-1a style hash for deterministic mock surfaces. */
export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function metersPerDegreeLat(latitude: number): number {
  return 111_132.92 - 559.82 * Math.cos((2 * latitude * Math.PI) / 180);
}

export function metersPerDegreeLon(latitude: number): number {
  return 111_412.84 * Math.cos((latitude * Math.PI) / 180);
}
