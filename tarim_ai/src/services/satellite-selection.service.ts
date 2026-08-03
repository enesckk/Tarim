import type { SatelliteProduct, SatelliteSearchResult } from '../types/satellite.types.js';

export interface BestProductSelection {
  product: SatelliteProduct;
  selectionReason: string;
}

const CLEAR_CLOUD_THRESHOLD = 20;
const NEAR_CLOUD_DELTA = 2;

/**
 * Sorts products newest-first and builds the search response shape.
 * Latest is always the most recent by datetime — cloud cover is ignored.
 */
export function selectAndSortProducts(products: SatelliteProduct[]): SatelliteSearchResult {
  const sorted = [...products].sort((a, b) => {
    const aTime = Date.parse(a.datetime);
    const bTime = Date.parse(b.datetime);
    return bTime - aTime;
  });

  return {
    count: sorted.length,
    latest: sorted[0] ?? null,
    products: sorted,
  };
}

/**
 * Returns the single most recent product, or null if the list is empty.
 */
export function selectLatestProduct(products: SatelliteProduct[]): SatelliteProduct | null {
  return selectAndSortProducts(products).latest;
}

/**
 * Selects the best usable product by cloud coverage, with recency as a tie-breaker.
 *
 * Rules:
 * 1. Prefer products with non-null cloudCoverage.
 * 2. Prefer cloudCoverage <= 20 when available.
 * 3. Among the candidate pool, prefer lower cloudCoverage.
 * 4. If cloudCoverage differs by less than 2 points, prefer the newer product.
 * 5. If no product is under 20%, fall back to the lowest cloudCoverage overall.
 * 6. If no cloudCoverage values exist, fall back to the latest product.
 */
export function selectBestProduct(products: SatelliteProduct[]): BestProductSelection | null {
  if (products.length === 0) {
    return null;
  }

  const withCloud = products.filter(
    (product): product is SatelliteProduct & { cloudCoverage: number } =>
      product.cloudCoverage != null && Number.isFinite(product.cloudCoverage),
  );

  if (withCloud.length === 0) {
    const latest = selectLatestProduct(products);
    if (!latest) {
      return null;
    }

    return {
      product: latest,
      selectionReason:
        'Bulut bilgisi bulunamadığı için en güncel görüntü seçildi.',
    };
  }

  const clearSky = withCloud.filter((product) => product.cloudCoverage <= CLEAR_CLOUD_THRESHOLD);
  const usedClearSkyPool = clearSky.length > 0;
  const pool = usedClearSkyPool ? clearSky : withCloud;

  const selected = pickLowestCloudPreferringRecent(pool);

  if (usedClearSkyPool) {
    return {
      product: selected,
      selectionReason:
        'Son 30 gündeki ürünler arasında en düşük bulut oranına sahip güncel görüntü seçildi.',
    };
  }

  return {
    product: selected,
    selectionReason:
      'Bulut oranı %20 altında ürün bulunamadığı için en düşük bulut oranına sahip görüntü seçildi.',
  };
}

function pickLowestCloudPreferringRecent(
  products: Array<SatelliteProduct & { cloudCoverage: number }>,
): SatelliteProduct {
  const lowestCloud = Math.min(...products.map((product) => product.cloudCoverage));

  const nearLowest = products.filter(
    (product) => product.cloudCoverage - lowestCloud < NEAR_CLOUD_DELTA,
  );

  // Within ~2 cloud points of the clearest scene, prefer the newest acquisition.
  nearLowest.sort((a, b) => Date.parse(b.datetime) - Date.parse(a.datetime));

  return nearLowest[0];
}

/**
 * Groups products by calendar day (UTC date portion of datetime).
 * Useful when multiple tiles exist for the same acquisition day.
 */
export function groupProductsByDay(
  products: SatelliteProduct[],
): Map<string, SatelliteProduct[]> {
  const groups = new Map<string, SatelliteProduct[]>();

  for (const product of products) {
    const day = product.datetime.slice(0, 10);
    const existing = groups.get(day) ?? [];
    existing.push(product);
    groups.set(day, existing);
  }

  return groups;
}
