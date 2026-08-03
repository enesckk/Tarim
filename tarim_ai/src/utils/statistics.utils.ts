export interface IndexStatisticsBase {
  min: number;
  max: number;
  mean: number;
  median: number;
  standardDeviation: number;
  validPixelCount: number;
  noDataPixelCount: number;
  totalPixelCount: number;
}

export interface NdviStatistics extends IndexStatisticsBase {
  vegetatedPixelCount: number;
  lowVegetationPixelCount: number;
  bareOrWaterPixelCount: number;
  vegetatedPixelRatio: number;
  lowVegetationPixelRatio: number;
  bareOrWaterPixelRatio: number;
}

export interface NdmiStatistics extends IndexStatisticsBase {
  highMoisturePixelCount: number;
  moderateMoisturePixelCount: number;
  lowMoisturePixelCount: number;
  highMoisturePixelRatio: number;
  moderateMoisturePixelRatio: number;
  lowMoisturePixelRatio: number;
}

export interface BsiStatistics extends IndexStatisticsBase {
  highBareSoilPixelCount: number;
  moderateBareSoilPixelCount: number;
  lowBareSoilPixelCount: number;
  highBareSoilPixelRatio: number;
  moderateBareSoilPixelRatio: number;
  lowBareSoilPixelRatio: number;
}

export type ClassifiedIndexStatistics = NdviStatistics | NdmiStatistics | BsiStatistics;

export const VEGETATED_THRESHOLD = 0.4;
export const LOW_VEGETATION_THRESHOLD = 0.2;

export const HIGH_MOISTURE_THRESHOLD = 0.2;
export const MODERATE_MOISTURE_THRESHOLD = 0.0;

export const HIGH_BARE_SOIL_THRESHOLD = 0.2;
export const MODERATE_BARE_SOIL_THRESHOLD = 0.0;

export type NdviClass = 'vegetated' | 'lowVegetation' | 'bareOrWater';
export type NdmiClass = 'highMoisture' | 'moderateMoisture' | 'lowMoisture';
export type BsiClass = 'highBareSoil' | 'moderateBareSoil' | 'lowBareSoil';

/**
 * Filters finite samples and excludes NaN / Infinity / non-numeric values.
 */
export function filterValidIndexValues(values: ArrayLike<number>): number[] {
  const valid: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (typeof value === 'number' && Number.isFinite(value)) {
      valid.push(value);
    }
  }
  return valid;
}

/** @deprecated Prefer filterValidIndexValues */
export const filterValidNdviValues = filterValidIndexValues;

export function roundTo4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function computeMean(values: number[]): number {
  if (values.length === 0) {
    return NaN;
  }
  let sum = 0;
  for (const value of values) {
    sum += value;
  }
  return sum / values.length;
}

export function computeMedian(values: number[]): number {
  if (values.length === 0) {
    return NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

export function computeStandardDeviation(values: number[], mean?: number): number {
  if (values.length === 0) {
    return NaN;
  }
  if (values.length === 1) {
    return 0;
  }

  const avg = mean ?? computeMean(values);
  let sumSquares = 0;
  for (const value of values) {
    const delta = value - avg;
    sumSquares += delta * delta;
  }

  return Math.sqrt(sumSquares / values.length);
}

/** NDVI = (NIR - Red) / (NIR + Red) using B08/B04. */
export function computeNdviValue(b08: number, b04: number): number {
  const denom = b08 + b04;
  if (denom === 0) {
    return Number.NaN;
  }
  return (b08 - b04) / denom;
}

/** NDMI = (NIR - SWIR) / (NIR + SWIR) using B08/B11. */
export function computeNdmiValue(b08: number, b11: number): number {
  const denom = b08 + b11;
  if (denom === 0) {
    return Number.NaN;
  }
  return (b08 - b11) / denom;
}

/** BSI = ((SWIR + Red) - (NIR + Blue)) / ((SWIR + Red) + (NIR + Blue)). */
export function computeBsiValue(b11: number, b04: number, b08: number, b02: number): number {
  const numerator = b11 + b04 - (b08 + b02);
  const denominator = b11 + b04 + b08 + b02;
  if (denominator === 0) {
    return Number.NaN;
  }
  return numerator / denominator;
}

export function classifyNdvi(value: number): NdviClass {
  if (value >= VEGETATED_THRESHOLD) {
    return 'vegetated';
  }
  if (value >= LOW_VEGETATION_THRESHOLD) {
    return 'lowVegetation';
  }
  return 'bareOrWater';
}

export function classifyNdmi(value: number): NdmiClass {
  if (value >= HIGH_MOISTURE_THRESHOLD) {
    return 'highMoisture';
  }
  if (value >= MODERATE_MOISTURE_THRESHOLD) {
    return 'moderateMoisture';
  }
  return 'lowMoisture';
}

export function classifyBsi(value: number): BsiClass {
  if (value >= HIGH_BARE_SOIL_THRESHOLD) {
    return 'highBareSoil';
  }
  if (value >= MODERATE_BARE_SOIL_THRESHOLD) {
    return 'moderateBareSoil';
  }
  return 'lowBareSoil';
}

function computeBaseStatistics(values: ArrayLike<number>): {
  base: IndexStatisticsBase;
  valid: number[];
} {
  const totalPixelCount = values.length;
  const valid = filterValidIndexValues(values);
  const validPixelCount = valid.length;
  const noDataPixelCount = totalPixelCount - validPixelCount;

  if (validPixelCount === 0) {
    return {
      valid,
      base: {
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        standardDeviation: 0,
        validPixelCount: 0,
        noDataPixelCount,
        totalPixelCount,
      },
    };
  }

  let min = valid[0];
  let max = valid[0];
  for (const value of valid) {
    if (value < min) min = value;
    if (value > max) max = value;
  }

  const mean = computeMean(valid);
  const median = computeMedian(valid);
  const standardDeviation = computeStandardDeviation(valid, mean);

  return {
    valid,
    base: {
      min: roundTo4(min),
      max: roundTo4(max),
      mean: roundTo4(mean),
      median: roundTo4(median),
      standardDeviation: roundTo4(standardDeviation),
      validPixelCount,
      noDataPixelCount,
      totalPixelCount,
    },
  };
}

/**
 * Computes NDVI summary statistics from a flat raster array.
 * NoData / NaN / Infinity values are excluded from numeric stats and ratios.
 */
export function computeNdviStatistics(values: ArrayLike<number>): NdviStatistics {
  const { base, valid } = computeBaseStatistics(values);

  let vegetatedPixelCount = 0;
  let lowVegetationPixelCount = 0;
  let bareOrWaterPixelCount = 0;

  for (const value of valid) {
    const clazz = classifyNdvi(value);
    if (clazz === 'vegetated') vegetatedPixelCount += 1;
    else if (clazz === 'lowVegetation') lowVegetationPixelCount += 1;
    else bareOrWaterPixelCount += 1;
  }

  if (base.validPixelCount === 0) {
    return {
      ...base,
      vegetatedPixelCount: 0,
      lowVegetationPixelCount: 0,
      bareOrWaterPixelCount: 0,
      vegetatedPixelRatio: 0,
      lowVegetationPixelRatio: 0,
      bareOrWaterPixelRatio: 0,
    };
  }

  return {
    ...base,
    vegetatedPixelCount,
    lowVegetationPixelCount,
    bareOrWaterPixelCount,
    vegetatedPixelRatio: roundTo4(vegetatedPixelCount / base.validPixelCount),
    lowVegetationPixelRatio: roundTo4(lowVegetationPixelCount / base.validPixelCount),
    bareOrWaterPixelRatio: roundTo4(bareOrWaterPixelCount / base.validPixelCount),
  };
}

export function computeNdmiStatistics(values: ArrayLike<number>): NdmiStatistics {
  const { base, valid } = computeBaseStatistics(values);

  let highMoisturePixelCount = 0;
  let moderateMoisturePixelCount = 0;
  let lowMoisturePixelCount = 0;

  for (const value of valid) {
    const clazz = classifyNdmi(value);
    if (clazz === 'highMoisture') highMoisturePixelCount += 1;
    else if (clazz === 'moderateMoisture') moderateMoisturePixelCount += 1;
    else lowMoisturePixelCount += 1;
  }

  if (base.validPixelCount === 0) {
    return {
      ...base,
      highMoisturePixelCount: 0,
      moderateMoisturePixelCount: 0,
      lowMoisturePixelCount: 0,
      highMoisturePixelRatio: 0,
      moderateMoisturePixelRatio: 0,
      lowMoisturePixelRatio: 0,
    };
  }

  return {
    ...base,
    highMoisturePixelCount,
    moderateMoisturePixelCount,
    lowMoisturePixelCount,
    highMoisturePixelRatio: roundTo4(highMoisturePixelCount / base.validPixelCount),
    moderateMoisturePixelRatio: roundTo4(moderateMoisturePixelCount / base.validPixelCount),
    lowMoisturePixelRatio: roundTo4(lowMoisturePixelCount / base.validPixelCount),
  };
}

export function computeBsiStatistics(values: ArrayLike<number>): BsiStatistics {
  const { base, valid } = computeBaseStatistics(values);

  let highBareSoilPixelCount = 0;
  let moderateBareSoilPixelCount = 0;
  let lowBareSoilPixelCount = 0;

  for (const value of valid) {
    const clazz = classifyBsi(value);
    if (clazz === 'highBareSoil') highBareSoilPixelCount += 1;
    else if (clazz === 'moderateBareSoil') moderateBareSoilPixelCount += 1;
    else lowBareSoilPixelCount += 1;
  }

  if (base.validPixelCount === 0) {
    return {
      ...base,
      highBareSoilPixelCount: 0,
      moderateBareSoilPixelCount: 0,
      lowBareSoilPixelCount: 0,
      highBareSoilPixelRatio: 0,
      moderateBareSoilPixelRatio: 0,
      lowBareSoilPixelRatio: 0,
    };
  }

  return {
    ...base,
    highBareSoilPixelCount,
    moderateBareSoilPixelCount,
    lowBareSoilPixelCount,
    highBareSoilPixelRatio: roundTo4(highBareSoilPixelCount / base.validPixelCount),
    moderateBareSoilPixelRatio: roundTo4(moderateBareSoilPixelCount / base.validPixelCount),
    lowBareSoilPixelRatio: roundTo4(lowBareSoilPixelCount / base.validPixelCount),
  };
}

export function hasValidIndexPixels(stats: IndexStatisticsBase): boolean {
  return stats.validPixelCount > 0;
}

/** @deprecated Prefer hasValidIndexPixels */
export const hasValidNdviPixels = hasValidIndexPixels;
