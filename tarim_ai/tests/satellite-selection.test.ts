import { describe, it, expect } from 'vitest';
import {
  selectAndSortProducts,
  selectLatestProduct,
  selectBestProduct,
  groupProductsByDay,
} from '../src/services/satellite-selection.service.js';
import type { SatelliteProduct } from '../src/types/satellite.types.js';

function product(
  partial: Partial<SatelliteProduct> & Pick<SatelliteProduct, 'id' | 'datetime'>,
): SatelliteProduct {
  return {
    satellite: 'Sentinel-2A',
    cloudCoverage: 10,
    tile: 'T37SCB',
    ...partial,
  };
}

describe('selectAndSortProducts', () => {
  it('sorts products newest first', () => {
    const products = [
      product({ id: 'a', datetime: '2024-06-01T10:00:00Z', cloudCoverage: 5 }),
      product({ id: 'b', datetime: '2024-06-15T10:00:00Z', cloudCoverage: 80 }),
      product({ id: 'c', datetime: '2024-06-10T10:00:00Z', cloudCoverage: 2 }),
    ];

    const result = selectAndSortProducts(products);

    expect(result.count).toBe(3);
    expect(result.products.map((p) => p.id)).toEqual(['b', 'c', 'a']);
    expect(result.latest?.id).toBe('b');
  });

  it('selects cloudy latest product when it is newest', () => {
    const products = [
      product({ id: 'clear', datetime: '2024-06-01T10:00:00Z', cloudCoverage: 1 }),
      product({ id: 'cloudy', datetime: '2024-06-20T10:00:00Z', cloudCoverage: 95 }),
    ];

    const latest = selectLatestProduct(products);

    expect(latest?.id).toBe('cloudy');
    expect(latest?.cloudCoverage).toBe(95);
  });

  it('returns empty result for empty input', () => {
    const result = selectAndSortProducts([]);

    expect(result.count).toBe(0);
    expect(result.latest).toBeNull();
    expect(result.products).toEqual([]);
  });

  it('keeps same-day multi-tile products sorted by datetime', () => {
    const products = [
      product({
        id: 'tile-a',
        datetime: '2024-06-15T08:30:00Z',
        tile: 'T37SCA',
      }),
      product({
        id: 'tile-b',
        datetime: '2024-06-15T08:35:00Z',
        tile: 'T37SCB',
      }),
    ];

    const result = selectAndSortProducts(products);

    expect(result.latest?.id).toBe('tile-b');
    expect(result.products).toHaveLength(2);
  });
});

describe('selectBestProduct', () => {
  it('prefers a slightly cloudier newer product when cloud delta is under 2', () => {
    const products = [
      product({ id: 'older-clearer', datetime: '2024-06-01T10:00:00Z', cloudCoverage: 5 }),
      product({ id: 'newer-slightly-cloudier', datetime: '2024-06-20T10:00:00Z', cloudCoverage: 6.5 }),
    ];

    const best = selectBestProduct(products);

    expect(best?.product.id).toBe('newer-slightly-cloudier');
    expect(best?.selectionReason).toContain('en düşük bulut');
  });

  it('keeps the clearer older product when cloud delta is 2 or more', () => {
    const products = [
      product({ id: 'older-clearer', datetime: '2024-06-01T10:00:00Z', cloudCoverage: 5 }),
      product({ id: 'newer-cloudier', datetime: '2024-06-20T10:00:00Z', cloudCoverage: 8 }),
    ];

    const best = selectBestProduct(products);

    expect(best?.product.id).toBe('older-clearer');
  });

  it('falls back to lowest cloud when all products are above 20%', () => {
    const products = [
      product({ id: 'a', datetime: '2024-06-20T10:00:00Z', cloudCoverage: 55 }),
      product({ id: 'b', datetime: '2024-06-18T10:00:00Z', cloudCoverage: 32 }),
      product({ id: 'c', datetime: '2024-06-10T10:00:00Z', cloudCoverage: 41 }),
    ];

    const best = selectBestProduct(products);

    expect(best?.product.id).toBe('b');
    expect(best?.product.cloudCoverage).toBe(32);
    expect(best?.selectionReason).toContain('%20 altında ürün bulunamadığı');
  });

  it('falls back to latest when all cloudCoverage values are null', () => {
    const products = [
      product({ id: 'old', datetime: '2024-06-01T10:00:00Z', cloudCoverage: null }),
      product({ id: 'new', datetime: '2024-06-20T10:00:00Z', cloudCoverage: null }),
    ];

    const best = selectBestProduct(products);

    expect(best?.product.id).toBe('new');
    expect(best?.selectionReason).toContain('Bulut bilgisi bulunamadığı');
  });

  it('ignores null cloud products when some cloud values exist', () => {
    const products = [
      product({ id: 'null-latest', datetime: '2024-06-25T10:00:00Z', cloudCoverage: null }),
      product({ id: 'clear', datetime: '2024-06-10T10:00:00Z', cloudCoverage: 4 }),
      product({ id: 'cloudy', datetime: '2024-06-20T10:00:00Z', cloudCoverage: 40 }),
    ];

    const best = selectBestProduct(products);

    expect(best?.product.id).toBe('clear');
  });

  it('returns null for empty input', () => {
    expect(selectBestProduct([])).toBeNull();
  });

  it('does not change latest selection behavior for cloudy newest scenes', () => {
    const products = [
      product({ id: 'clear', datetime: '2024-06-01T10:00:00Z', cloudCoverage: 1 }),
      product({ id: 'cloudy', datetime: '2024-06-20T10:00:00Z', cloudCoverage: 95 }),
    ];

    expect(selectLatestProduct(products)?.id).toBe('cloudy');
    expect(selectBestProduct(products)?.product.id).toBe('clear');
  });
});

describe('groupProductsByDay', () => {
  it('groups products by UTC calendar day', () => {
    const products = [
      product({ id: '1', datetime: '2024-06-15T08:00:00Z' }),
      product({ id: '2', datetime: '2024-06-15T09:00:00Z' }),
      product({ id: '3', datetime: '2024-06-16T09:00:00Z' }),
    ];

    const groups = groupProductsByDay(products);

    expect(groups.get('2024-06-15')).toHaveLength(2);
    expect(groups.get('2024-06-16')).toHaveLength(1);
  });
});
