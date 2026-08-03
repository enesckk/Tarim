import { describe, it, expect } from 'vitest';
import {
  getIsoWeekKey,
  pickBestPerKey,
  selectTimeSeriesAcquisitions,
} from '../src/services/time-series-selection.service.js';
import { mapWithConcurrency } from '../src/utils/concurrency.utils.js';
import {
  computeTrend,
  resolveTimeSeriesConfidence,
  resolveTrendDirection,
} from '../src/utils/trend.utils.js';
import { timeSeriesResponseSchema } from '../src/schemas/time-series.schema.js';
import type { SatelliteProduct } from '../src/types/satellite.types.js';

function product(
  partial: Partial<SatelliteProduct> & Pick<SatelliteProduct, 'id' | 'datetime'>,
): SatelliteProduct & { cloudCoverage: number } {
  return {
    satellite: 'Sentinel-2A',
    tile: 'T37SCB',
    ...partial,
    cloudCoverage: partial.cloudCoverage ?? 10,
  };
}

describe('time-series selection', () => {
  it('picks lowest cloudCoverage for the same day, then newer datetime on ties', () => {
    const products = [
      product({ id: 'a', datetime: '2024-06-10T08:00:00Z', cloudCoverage: 12 }),
      product({ id: 'b', datetime: '2024-06-10T09:00:00Z', cloudCoverage: 5 }),
      product({ id: 'c', datetime: '2024-06-10T10:00:00Z', cloudCoverage: 5 }),
    ];

    const best = pickBestPerKey(products, (p) => p.datetime.slice(0, 10));
    expect(best).toHaveLength(1);
    expect(best[0].id).toBe('c');
  });

  it('keeps weekly-best acquisition after daily filtering', () => {
    const products = [
      product({ id: 'w1-cloudy', datetime: '2024-06-03T10:00:00Z', cloudCoverage: 18 }), // week 23
      product({ id: 'w1-clear', datetime: '2024-06-05T10:00:00Z', cloudCoverage: 4 }),
      product({ id: 'w2-a', datetime: '2024-06-10T10:00:00Z', cloudCoverage: 8 }), // week 24
      product({ id: 'w2-b', datetime: '2024-06-12T10:00:00Z', cloudCoverage: 15 }),
      product({ id: 'too-cloudy', datetime: '2024-06-20T10:00:00Z', cloudCoverage: 40 }),
    ];

    const selected = selectTimeSeriesAcquisitions(products, 20);
    expect(selected.map((p) => p.id)).toEqual(['w1-clear', 'w2-a']);
    expect(getIsoWeekKey('2024-06-05T10:00:00Z')).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe('trend utils', () => {
  it('resolves increasing / decreasing / stable directions', () => {
    expect(resolveTrendDirection(0.12)).toBe('increasing');
    expect(resolveTrendDirection(-0.15)).toBe('decreasing');
    expect(resolveTrendDirection(0.05)).toBe('stable');
  });

  it('computes trend stats from chronological values', () => {
    const trend = computeTrend([0.1, 0.2, 0.35]);
    expect(trend.first).toBe(0.1);
    expect(trend.last).toBe(0.35);
    expect(trend.change).toBe(0.25);
    expect(trend.direction).toBe('increasing');
    expect(trend.min).toBe(0.1);
    expect(trend.max).toBe(0.35);
  });

  it('resolves time-series confidence rules', () => {
    expect(resolveTimeSeriesConfidence(8, 0.4)).toBe('high');
    expect(resolveTimeSeriesConfidence(4, 0.25)).toBe('medium');
    expect(resolveTimeSeriesConfidence(3, 0.9)).toBe('low');
  });
});

describe('concurrency and failed acquisition tolerance', () => {
  it('preserves order with limited concurrency', async () => {
    const started: number[] = [];
    const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      started.push(n);
      await new Promise((resolve) => setTimeout(resolve, 10));
      return n * 2;
    });

    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(started).toHaveLength(5);
  });

  it('does not abort other tasks when one mapper fails if caller catches', async () => {
    const outcomes = await mapWithConcurrency(['ok', 'fail', 'ok2'], 2, async (item) => {
      try {
        if (item === 'fail') {
          throw new Error('boom');
        }
        return { item, status: 'success' as const };
      } catch {
        return { item, status: 'failed' as const };
      }
    });

    expect(outcomes.map((o) => o.status)).toEqual(['success', 'failed', 'success']);
  });
});

describe('time-series response schema', () => {
  it('accepts a valid response payload', () => {
    const payload = {
      period: {
        start: '2026-01-28T00:00:00.000Z',
        end: '2026-07-28T00:00:00.000Z',
        months: 6,
      },
      filters: {
        maxCloudCoverage: 20,
        sampling: 'weekly-best' as const,
      },
      summary: {
        catalogProductCount: 40,
        selectedAcquisitionCount: 12,
        successfulAcquisitionCount: 11,
        failedAcquisitionCount: 1,
      },
      series: [
        {
          productId: 'p1',
          datetime: '2026-02-01T08:00:00.000Z',
          satellite: 'sentinel-2a',
          tile: 'T37SCB',
          cloudCoverage: 4,
          validPixelRatio: 0.5,
          indices: { ndviMean: 0.2, ndmiMean: -0.05, bsiMean: 0.1 },
          status: 'success' as const,
        },
        {
          productId: 'p2',
          datetime: '2026-02-08T08:00:00.000Z',
          satellite: 'sentinel-2b',
          tile: 'T37SCB',
          cloudCoverage: 10,
          validPixelRatio: null,
          indices: null,
          status: 'failed' as const,
        },
      ],
      trends: {
        ndvi: {
          first: 0.2,
          last: 0.25,
          min: 0.2,
          max: 0.25,
          mean: 0.225,
          change: 0.05,
          direction: 'stable' as const,
        },
        ndmi: {
          first: -0.05,
          last: -0.02,
          min: -0.05,
          max: -0.02,
          mean: -0.035,
          change: 0.03,
          direction: 'stable' as const,
        },
        bsi: {
          first: 0.1,
          last: 0.12,
          min: 0.1,
          max: 0.12,
          mean: 0.11,
          change: 0.02,
          direction: 'stable' as const,
        },
      },
      interpretation: {
        vegetationTrend: 'Bitki örtüsü sinyalinde belirgin bir değişim eğilimi görülmemektedir.',
        moistureTrend: 'Nem sinyalinde belirgin bir değişim eğilimi görülmemektedir.',
        soilSurfaceTrend: 'Çıplak toprak sinyalinde belirgin bir değişim eğilimi görülmemektedir.',
        summary:
          'Bu zaman serisi yalnızca uydu sinyallerine dayanır ve saha ile toprak analiziyle doğrulanmalıdır.',
        confidence: 'medium' as const,
      },
    };

    expect(() => timeSeriesResponseSchema.parse(payload)).not.toThrow();
  });
});
