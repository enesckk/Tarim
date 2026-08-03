import { unitIdForCode } from '../../../soil-laboratory/catalogs/measurement-unit.catalog.js';
import type {
  AgroClimateCoverageSummary,
  DailyClimateValue,
  IndicatorCalculationOutcome,
} from '../../types/agroclimate.types.js';

/**
 * Phase 2.3A — Precipitation indicators (category PRECIPITATION).
 * Missing precipitation days MUST NOT count as dry (or as rainy) — they simply
 * break streaks and are excluded from sums/means computed over "known days".
 */

export type PrecipitationCalculationConfig = {
  /** mm — daily precipitation >= threshold counts as a rainy day. */
  rainyDayThreshold: number | null;
  /** mm — daily precipitation >= threshold counts as heavy rain. */
  heavyRainThreshold: number | null;
  periodStartDate: string;
  periodEndDate: string;
};

function daysBetweenInclusive(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

function sortedKnown(values: DailyClimateValue[]): DailyClimateValue[] {
  return values
    .filter((d) => d.value != null)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildCoverage(
  values: DailyClimateValue[],
  periodStartDate: string,
  periodEndDate: string,
): AgroClimateCoverageSummary {
  const knownDays = values.filter((d) => d.value != null).length;
  const expectedDays = daysBetweenInclusive(periodStartDate, periodEndDate);
  return {
    knownDays,
    expectedDays,
    missingDays: Math.max(0, expectedDays - knownDays),
    coverageRatio: expectedDays > 0 ? knownDays / expectedDays : null,
  };
}

function insufficient(
  indicatorCode: IndicatorCalculationOutcome['indicatorCode'],
  formulaCode: string,
  formulaVersion: string,
  unitId: string | null,
  message: string,
  inputSummary: Record<string, unknown> = {},
): IndicatorCalculationOutcome {
  return {
    indicatorCode,
    calculatedValue: null,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary,
    coverage: null,
    calculationStatus: 'INSUFFICIENT_DATA',
    calculationMessage: message,
  };
}

function totalPrecipitationOutcome(
  indicatorCode: IndicatorCalculationOutcome['indicatorCode'],
  formulaCode: string,
  formulaVersion: string,
  dailyPrecip: DailyClimateValue[],
  config: PrecipitationCalculationConfig,
): IndicatorCalculationOutcome {
  const unitId = unitIdForCode('MM');
  const coverage = buildCoverage(dailyPrecip, config.periodStartDate, config.periodEndDate);
  if (coverage.knownDays === 0) {
    return insufficient(
      indicatorCode,
      formulaCode,
      formulaVersion,
      unitId,
      'No PRECIPITATION observations available in the analysis period',
    );
  }
  const total = sortedKnown(dailyPrecip).reduce((sum, d) => sum + (d.value as number), 0);
  return {
    indicatorCode,
    calculatedValue: total,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: {},
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculateTotalPrecipitation(
  dailyPrecip: DailyClimateValue[],
  config: PrecipitationCalculationConfig,
): IndicatorCalculationOutcome {
  return totalPrecipitationOutcome('TOTAL_PRECIPITATION', 'TOTAL_PRECIPITATION', 'TOTAL_PRECIPITATION_v1', dailyPrecip, config);
}

/** Same aggregation as TOTAL_PRECIPITATION, scoped to a seasonal analysis period. */
export function calculateSeasonalPrecipitation(
  dailyPrecip: DailyClimateValue[],
  config: PrecipitationCalculationConfig,
): IndicatorCalculationOutcome {
  return totalPrecipitationOutcome(
    'SEASONAL_PRECIPITATION',
    'SEASONAL_PRECIPITATION',
    'SEASONAL_PRECIPITATION_v1',
    dailyPrecip,
    config,
  );
}

export function calculateRainyDayCount(
  dailyPrecip: DailyClimateValue[],
  config: PrecipitationCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'RAINY_DAY_COUNT';
  const formulaVersion = 'RAINY_DAY_COUNT_v1';
  const unitId = unitIdForCode('DAY');
  if (config.rainyDayThreshold == null) {
    return insufficient('RAINY_DAY_COUNT', formulaCode, formulaVersion, unitId, 'Rainy-day threshold not configured');
  }
  const coverage = buildCoverage(dailyPrecip, config.periodStartDate, config.periodEndDate);
  if (coverage.knownDays === 0) {
    return insufficient(
      'RAINY_DAY_COUNT',
      formulaCode,
      formulaVersion,
      unitId,
      'No PRECIPITATION observations available in the analysis period',
    );
  }
  const count = sortedKnown(dailyPrecip).filter((d) => (d.value as number) >= config.rainyDayThreshold!).length;
  return {
    indicatorCode: 'RAINY_DAY_COUNT',
    calculatedValue: count,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: { rainyDayThreshold: config.rainyDayThreshold },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculateHeavyRainDayCount(
  dailyPrecip: DailyClimateValue[],
  config: PrecipitationCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'HEAVY_RAIN_DAY_COUNT';
  const formulaVersion = 'HEAVY_RAIN_DAY_COUNT_v1';
  const unitId = unitIdForCode('DAY');
  if (config.heavyRainThreshold == null) {
    return insufficient(
      'HEAVY_RAIN_DAY_COUNT',
      formulaCode,
      formulaVersion,
      unitId,
      'Heavy-rain threshold not configured',
    );
  }
  const coverage = buildCoverage(dailyPrecip, config.periodStartDate, config.periodEndDate);
  if (coverage.knownDays === 0) {
    return insufficient(
      'HEAVY_RAIN_DAY_COUNT',
      formulaCode,
      formulaVersion,
      unitId,
      'No PRECIPITATION observations available in the analysis period',
    );
  }
  const count = sortedKnown(dailyPrecip).filter(
    (d) => (d.value as number) >= config.heavyRainThreshold!,
  ).length;
  return {
    indicatorCode: 'HEAVY_RAIN_DAY_COUNT',
    calculatedValue: count,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: { heavyRainThreshold: config.heavyRainThreshold },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculateMaximumDailyPrecipitation(
  dailyPrecip: DailyClimateValue[],
  config: PrecipitationCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'MAXIMUM_DAILY_PRECIPITATION';
  const formulaVersion = 'MAXIMUM_DAILY_PRECIPITATION_v1';
  const unitId = unitIdForCode('MM');
  const coverage = buildCoverage(dailyPrecip, config.periodStartDate, config.periodEndDate);
  if (coverage.knownDays === 0) {
    return insufficient(
      'MAXIMUM_DAILY_PRECIPITATION',
      formulaCode,
      formulaVersion,
      unitId,
      'No PRECIPITATION observations available in the analysis period',
    );
  }
  const max = sortedKnown(dailyPrecip).reduce((m, d) => Math.max(m, d.value as number), -Infinity);
  return {
    indicatorCode: 'MAXIMUM_DAILY_PRECIPITATION',
    calculatedValue: max,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: {},
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function daysInMonth(monthKeyStr: string): number {
  const [year, month] = monthKeyStr.split('-').map(Number);
  return new Date(Date.UTC(year!, month!, 0)).getUTCDate();
}

export type MonthlyTotal = { month: string; total: number; knownDays: number; expectedDays: number };

/** Only calendar months where every day in the month is known are included. */
export function computeCompleteMonthlyTotals(dailyPrecip: DailyClimateValue[]): MonthlyTotal[] {
  const byMonth = new Map<string, { total: number; knownDays: number }>();
  for (const day of dailyPrecip) {
    if (day.value == null) continue;
    const key = monthKey(day.date);
    const entry = byMonth.get(key) ?? { total: 0, knownDays: 0 };
    entry.total += day.value;
    entry.knownDays += 1;
    byMonth.set(key, entry);
  }
  const results: MonthlyTotal[] = [];
  for (const [month, entry] of byMonth) {
    const expectedDays = daysInMonth(month);
    if (entry.knownDays === expectedDays) {
      results.push({ month, total: entry.total, knownDays: entry.knownDays, expectedDays });
    }
  }
  return results.sort((a, b) => a.month.localeCompare(b.month));
}

export function calculatePrecipitationVariability(
  dailyPrecip: DailyClimateValue[],
  config: PrecipitationCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'PRECIPITATION_VARIABILITY';
  const formulaVersion = 'PRECIPITATION_VARIABILITY_v1';
  const unitId = unitIdForCode('MM');
  const coverage = buildCoverage(dailyPrecip, config.periodStartDate, config.periodEndDate);
  const monthlyTotals = computeCompleteMonthlyTotals(dailyPrecip);
  if (monthlyTotals.length < 2) {
    return insufficient(
      'PRECIPITATION_VARIABILITY',
      formulaCode,
      formulaVersion,
      unitId,
      'Fewer than two fully-known calendar months in the analysis period',
      { completeMonths: monthlyTotals.length },
    );
  }
  const mean = monthlyTotals.reduce((s, m) => s + m.total, 0) / monthlyTotals.length;
  const variance = monthlyTotals.reduce((s, m) => s + (m.total - mean) ** 2, 0) / monthlyTotals.length;
  return {
    indicatorCode: 'PRECIPITATION_VARIABILITY',
    calculatedValue: Math.sqrt(variance),
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: { monthlyTotals, mean },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculatePrecipitationConcentration(
  dailyPrecip: DailyClimateValue[],
  config: PrecipitationCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'PRECIPITATION_CONCENTRATION';
  const formulaVersion = 'PRECIPITATION_CONCENTRATION_v1';
  const unitId = unitIdForCode('NONE');
  const coverage = buildCoverage(dailyPrecip, config.periodStartDate, config.periodEndDate);
  const monthlyTotals = computeCompleteMonthlyTotals(dailyPrecip);
  if (monthlyTotals.length < 2) {
    return insufficient(
      'PRECIPITATION_CONCENTRATION',
      formulaCode,
      formulaVersion,
      unitId,
      'Fewer than two fully-known calendar months in the analysis period',
      { completeMonths: monthlyTotals.length },
    );
  }
  const sumTotals = monthlyTotals.reduce((s, m) => s + m.total, 0);
  const sumSquares = monthlyTotals.reduce((s, m) => s + m.total * m.total, 0);
  if (sumTotals === 0) {
    return {
      indicatorCode: 'PRECIPITATION_CONCENTRATION',
      calculatedValue: null,
      valueDate: null,
      unitId,
      formulaCode,
      formulaVersion,
      inputSummary: { monthlyTotals },
      coverage,
      calculationStatus: 'INVALID_INPUT',
      calculationMessage: 'Sum of monthly precipitation totals is zero',
    };
  }
  const pci = (100 * sumSquares) / (sumTotals * sumTotals);
  return {
    indicatorCode: 'PRECIPITATION_CONCENTRATION',
    calculatedValue: pci,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: { monthlyTotals },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculateAllPrecipitationIndicators(
  dailyPrecip: DailyClimateValue[],
  config: PrecipitationCalculationConfig,
): IndicatorCalculationOutcome[] {
  return [
    calculateTotalPrecipitation(dailyPrecip, config),
    calculateSeasonalPrecipitation(dailyPrecip, config),
    calculateRainyDayCount(dailyPrecip, config),
    calculateHeavyRainDayCount(dailyPrecip, config),
    calculateMaximumDailyPrecipitation(dailyPrecip, config),
    calculatePrecipitationVariability(dailyPrecip, config),
    calculatePrecipitationConcentration(dailyPrecip, config),
  ];
}
