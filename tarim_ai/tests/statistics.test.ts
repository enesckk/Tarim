import { describe, it, expect } from 'vitest';
import {
  classifyBsi,
  classifyNdmi,
  classifyNdvi,
  computeBsiStatistics,
  computeBsiValue,
  computeMean,
  computeMedian,
  computeNdmiStatistics,
  computeNdmiValue,
  computeNdviStatistics,
  computeNdviValue,
  computeStandardDeviation,
  filterValidIndexValues,
  hasValidIndexPixels,
  roundTo4,
} from '../src/utils/statistics.utils.js';
import {
  buildInterpretation,
  interpretMoistureStatus,
  interpretSoilSurfaceStatus,
  interpretVegetationStatus,
  resolveConfidence,
} from '../src/services/agricultural-analysis.service.js';
import { ndviStatisticsResponseSchema } from '../src/schemas/ndvi-statistics.schema.js';
import { analysisSummaryResponseSchema } from '../src/schemas/analysis.schema.js';
import type { BsiStatistics, NdmiStatistics, NdviStatistics } from '../src/utils/statistics.utils.js';

describe('index formulas', () => {
  it('computes NDVI from B08 and B04', () => {
    expect(computeNdviValue(0.6, 0.2)).toBeCloseTo(0.5);
    expect(computeNdviValue(0.2, 0.2)).toBeCloseTo(0);
    expect(Number.isNaN(computeNdviValue(0, 0))).toBe(true);
  });

  it('computes NDMI from B08 and B11', () => {
    expect(computeNdmiValue(0.5, 0.3)).toBeCloseTo(0.25);
    expect(computeNdmiValue(0.2, 0.4)).toBeCloseTo(-1 / 3);
    expect(Number.isNaN(computeNdmiValue(0, 0))).toBe(true);
  });

  it('computes BSI from B11, B04, B08 and B02', () => {
    // ((0.4+0.2)-(0.3+0.1))/((0.4+0.2)+(0.3+0.1)) = 0.2/1.0 = 0.2
    expect(computeBsiValue(0.4, 0.2, 0.3, 0.1)).toBeCloseTo(0.2);
    expect(Number.isNaN(computeBsiValue(0, 0, 0, 0))).toBe(true);
  });
});

describe('statistics utils', () => {
  it('computes mean, median, min, max and standard deviation', () => {
    const values = [0.1, 0.2, 0.3, 0.4, 0.5];
    const stats = computeNdviStatistics(values);

    expect(stats.min).toBe(0.1);
    expect(stats.max).toBe(0.5);
    expect(stats.mean).toBe(0.3);
    expect(stats.median).toBe(0.3);
    expect(stats.standardDeviation).toBe(roundTo4(computeStandardDeviation(values, 0.3)));
    expect(computeMean(values)).toBeCloseTo(0.3);
    expect(computeMedian(values)).toBe(0.3);
    expect(computeMedian([0.1, 0.2, 0.3, 0.4])).toBeCloseTo(0.25);
  });

  it('filters NoData, NaN and Infinity values', () => {
    const values = [0.2, Number.NaN, 0.5, Number.POSITIVE_INFINITY, -0.1, Number.NEGATIVE_INFINITY];
    const valid = filterValidIndexValues(values);
    const stats = computeNdviStatistics(values);

    expect(valid).toEqual([0.2, 0.5, -0.1]);
    expect(stats.validPixelCount).toBe(3);
    expect(stats.noDataPixelCount).toBe(3);
    expect(stats.totalPixelCount).toBe(6);
  });

  it('classifies NDVI / NDMI / BSI thresholds correctly', () => {
    expect(classifyNdvi(0.4)).toBe('vegetated');
    expect(classifyNdvi(0.2)).toBe('lowVegetation');
    expect(classifyNdvi(0.19)).toBe('bareOrWater');

    expect(classifyNdmi(0.2)).toBe('highMoisture');
    expect(classifyNdmi(0.05)).toBe('moderateMoisture');
    expect(classifyNdmi(-0.01)).toBe('lowMoisture');

    expect(classifyBsi(0.2)).toBe('highBareSoil');
    expect(classifyBsi(0.05)).toBe('moderateBareSoil');
    expect(classifyBsi(-0.01)).toBe('lowBareSoil');
  });

  it('computes NDMI and BSI class counts and ratios', () => {
    const ndmi = computeNdmiStatistics([0.3, 0.1, -0.2, Number.NaN]);
    expect(ndmi.highMoisturePixelCount).toBe(1);
    expect(ndmi.moderateMoisturePixelCount).toBe(1);
    expect(ndmi.lowMoisturePixelCount).toBe(1);
    expect(ndmi.highMoisturePixelRatio).toBeCloseTo(1 / 3, 4);

    const bsi = computeBsiStatistics([0.3, 0.1, -0.2]);
    expect(bsi.highBareSoilPixelCount).toBe(1);
    expect(bsi.moderateBareSoilPixelCount).toBe(1);
    expect(bsi.lowBareSoilPixelCount).toBe(1);
  });

  it('returns empty stats when there are no valid pixels', () => {
    const stats = computeNdviStatistics([Number.NaN, Number.POSITIVE_INFINITY]);

    expect(hasValidIndexPixels(stats)).toBe(false);
    expect(stats.validPixelCount).toBe(0);
    expect(stats.noDataPixelCount).toBe(2);
    expect(stats.mean).toBe(0);
    expect(stats.vegetatedPixelRatio).toBe(0);
  });
});

describe('interpretation and confidence rules', () => {
  it('maps vegetation / moisture / soil status without absolute claims', () => {
    expect(interpretVegetationStatus(0.55)).toContain('Yoğun bitki örtüsü');
    expect(interpretVegetationStatus(0.35)).toContain('Orta seviyede');
    expect(interpretVegetationStatus(0.22)).toContain('Düşük veya seyrek');
    expect(interpretVegetationStatus(0.1)).toContain('Çok düşük');

    expect(interpretMoistureStatus(0.25)).toContain('Yüksek nem');
    expect(interpretMoistureStatus(0.05)).toContain('Orta nem');
    expect(interpretMoistureStatus(-0.1)).toContain('Düşük nem');

    expect(interpretSoilSurfaceStatus(0.25)).toContain('Belirgin çıplak toprak');
    expect(interpretSoilSurfaceStatus(0.05)).toContain('Orta düzey');
    expect(interpretSoilSurfaceStatus(-0.1)).toContain('düşük');
  });

  it('resolves confidence from cloud coverage and valid pixel ratio', () => {
    expect(resolveConfidence(3, 0.5)).toBe('high');
    expect(resolveConfidence(10, 0.3)).toBe('medium');
    expect(resolveConfidence(20, 0.5)).toBe('low');
    expect(resolveConfidence(null, 0.9)).toBe('low');
  });

  it('builds interpretation summary with cautionary wording', () => {
    const ndvi = computeNdviStatistics([0.22, 0.18, 0.25]);
    const ndmi = computeNdmiStatistics([-0.05, -0.1, 0.02]);
    const bsi = computeBsiStatistics([0.25, 0.3, 0.1]);

    const interpretation = buildInterpretation({
      ndvi,
      ndmi,
      bsi,
      cloudCoverage: 0,
    });

    expect(interpretation.summary).toContain('saha ile toprak analiziyle doğrulanmalıdır');
    expect(interpretation.summary).not.toMatch(/susuz|ekime uygun değildir/i);
    expect(['low', 'medium', 'high']).toContain(interpretation.confidence);
  });
});

describe('response schemas', () => {
  it('accepts a valid NDVI statistics response payload', () => {
    const payload = {
      selectionType: 'best' as const,
      selectionReason:
        'Son 30 gündeki ürünler arasında en düşük bulut oranına sahip güncel görüntü seçildi.',
      product: {
        productId: 'S2C_MSIL2A_20260723T081611_N0512_R121_T37SCB_20260723T120609.SAFE',
        datetime: '2026-07-23T08:29:43.246Z',
        satellite: 'sentinel-2c',
        tile: 'T37SCB',
        cloudCoverage: 0,
      },
      statistics: {
        min: 0.0123,
        max: 0.8123,
        mean: 0.4123,
        median: 0.4001,
        standardDeviation: 0.1234,
        validPixelCount: 100,
        noDataPixelCount: 20,
        totalPixelCount: 120,
        vegetatedPixelCount: 40,
        lowVegetationPixelCount: 30,
        bareOrWaterPixelCount: 30,
        vegetatedPixelRatio: 0.4,
        lowVegetationPixelRatio: 0.3,
        bareOrWaterPixelRatio: 0.3,
      },
    };

    expect(() => ndviStatisticsResponseSchema.parse(payload)).not.toThrow();
  });

  it('accepts a valid analysis-summary response payload', () => {
    const ndvi: NdviStatistics = {
      min: 0.1,
      max: 0.5,
      mean: 0.22,
      median: 0.2,
      standardDeviation: 0.05,
      validPixelCount: 100,
      noDataPixelCount: 20,
      totalPixelCount: 120,
      vegetatedPixelCount: 10,
      lowVegetationPixelCount: 40,
      bareOrWaterPixelCount: 50,
      vegetatedPixelRatio: 0.1,
      lowVegetationPixelRatio: 0.4,
      bareOrWaterPixelRatio: 0.5,
    };
    const ndmi: NdmiStatistics = {
      min: -0.2,
      max: 0.3,
      mean: -0.05,
      median: -0.04,
      standardDeviation: 0.08,
      validPixelCount: 100,
      noDataPixelCount: 20,
      totalPixelCount: 120,
      highMoisturePixelCount: 10,
      moderateMoisturePixelCount: 20,
      lowMoisturePixelCount: 70,
      highMoisturePixelRatio: 0.1,
      moderateMoisturePixelRatio: 0.2,
      lowMoisturePixelRatio: 0.7,
    };
    const bsi: BsiStatistics = {
      min: -0.1,
      max: 0.4,
      mean: 0.21,
      median: 0.2,
      standardDeviation: 0.07,
      validPixelCount: 100,
      noDataPixelCount: 20,
      totalPixelCount: 120,
      highBareSoilPixelCount: 50,
      moderateBareSoilPixelCount: 30,
      lowBareSoilPixelCount: 20,
      highBareSoilPixelRatio: 0.5,
      moderateBareSoilPixelRatio: 0.3,
      lowBareSoilPixelRatio: 0.2,
    };

    const payload = {
      selectionType: 'best' as const,
      selectionReason: 'Son 30 gündeki ürünler arasında en düşük bulut oranına sahip güncel görüntü seçildi.',
      product: {
        productId: 'id',
        datetime: '2026-07-23T08:29:43.246Z',
        satellite: 'sentinel-2c',
        tile: 'T37SCB',
        cloudCoverage: 0,
      },
      indices: { ndvi, ndmi, bsi },
      interpretation: buildInterpretation({ ndvi, ndmi, bsi, cloudCoverage: 0 }),
    };

    expect(() => analysisSummaryResponseSchema.parse(payload)).not.toThrow();
  });
});
