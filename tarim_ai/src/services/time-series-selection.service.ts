import type { SatelliteProduct } from '../types/satellite.types.js';

/**
 * Filters products with known cloud coverage at or below the threshold,
 * then keeps one product per calendar day and one per ISO week.
 */
export function selectTimeSeriesAcquisitions(
  products: SatelliteProduct[],
  maxCloudCoverage: number,
): SatelliteProduct[] {
  const cloudyFiltered = products.filter(
    (product): product is SatelliteProduct & { cloudCoverage: number } =>
      product.cloudCoverage != null &&
      Number.isFinite(product.cloudCoverage) &&
      product.cloudCoverage <= maxCloudCoverage,
  );

  const dailyBest = pickBestPerKey(cloudyFiltered, (product) => product.datetime.slice(0, 10));
  const weeklyBest = pickBestPerKey(dailyBest, (product) => getIsoWeekKey(product.datetime));

  return weeklyBest.sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));
}

/**
 * Among products sharing the same key, prefer lowest cloudCoverage,
 * then newer datetime when clouds are equal.
 */
export function pickBestPerKey(
  products: Array<SatelliteProduct & { cloudCoverage: number }>,
  keyFn: (product: SatelliteProduct) => string,
): Array<SatelliteProduct & { cloudCoverage: number }> {
  const groups = new Map<string, Array<SatelliteProduct & { cloudCoverage: number }>>();

  for (const product of products) {
    const key = keyFn(product);
    const existing = groups.get(key) ?? [];
    existing.push(product);
    groups.set(key, existing);
  }

  const selected: Array<SatelliteProduct & { cloudCoverage: number }> = [];

  for (const group of groups.values()) {
    group.sort((a, b) => {
      const cloudDiff = a.cloudCoverage - b.cloudCoverage;
      if (cloudDiff !== 0) {
        return cloudDiff;
      }
      return Date.parse(b.datetime) - Date.parse(a.datetime);
    });
    selected.push(group[0]);
  }

  return selected;
}

/**
 * Returns an ISO week key like 2026-W30 (UTC-based).
 */
export function getIsoWeekKey(datetime: string): string {
  const date = new Date(datetime);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid datetime: ${datetime}`);
  }

  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);

  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}
