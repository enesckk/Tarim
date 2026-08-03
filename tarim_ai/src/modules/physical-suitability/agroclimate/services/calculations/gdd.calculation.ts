import { unitIdForCode } from '../../../soil-laboratory/catalogs/measurement-unit.catalog.js';
import type {
  AgroClimateCoverageSummary,
  DailyClimateValue,
  GddMethod,
  IndicatorCalculationOutcome,
} from '../../types/agroclimate.types.js';

/**
 * Phase 2.3A — Growing degree day and growing-season indicators (category GROWING_SEASON).
 * Only SIMPLE_AVERAGE is implemented:
 *   GDD_day = max(0, (Tmin + Tmax) / 2 − base)
 * Days missing Tmin OR Tmax are skipped entirely (never substituted with 0).
 * SINGLE_SINE / DOUBLE_SINE always report INSUFFICIENT_DATA — not implemented.
 * Growing-season start/end/length detection rules are not defined in Phase
 * 2.3A and always report INSUFFICIENT_DATA.
 */

export type GddCalculationConfig = {
  method: GddMethod;
  /** °C — required. */
  baseTemperatureC: number | null;
  /** °C — optional cap applied to Tmax before averaging. */
  upperThresholdC: number | null;
  periodStartDate: string;
  periodEndDate: string;
};

type DailyPair = { date: string; tMin: number | null; tMax: number | null };

function daysBetweenInclusive(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

export function mergeDailyMinMax(
  dailyMinTemps: DailyClimateValue[],
  dailyMaxTemps: DailyClimateValue[],
): DailyPair[] {
  const byDate = new Map<string, DailyPair>();
  for (const d of dailyMinTemps) {
    byDate.set(d.date, { date: d.date, tMin: d.value, tMax: byDate.get(d.date)?.tMax ?? null });
  }
  for (const d of dailyMaxTemps) {
    const existing = byDate.get(d.date);
    byDate.set(d.date, { date: d.date, tMin: existing?.tMin ?? null, tMax: d.value });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Single day GDD under the simple-average method. Caller guarantees both temps are known. */
export function calculateDailyGddSimpleAverage(
  tMin: number,
  tMax: number,
  baseTemperatureC: number,
  upperThresholdC: number | null,
): number {
  const effectiveMax = upperThresholdC != null ? Math.min(tMax, upperThresholdC) : tMax;
  return Math.max(0, (tMin + effectiveMax) / 2 - baseTemperatureC);
}

function buildCoverage(
  knownDays: number,
  periodStartDate: string,
  periodEndDate: string,
): AgroClimateCoverageSummary {
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

/** Accumulates simple-average GDD; skips any day missing Tmin or Tmax. */
function accumulateSimpleAverageGdd(
  dailyMinTemps: DailyClimateValue[],
  dailyMaxTemps: DailyClimateValue[],
  baseTemperatureC: number,
  upperThresholdC: number | null,
): { total: number; knownDays: number; activeDays: number; pairs: DailyPair[] } {
  const pairs = mergeDailyMinMax(dailyMinTemps, dailyMaxTemps);
  let total = 0;
  let knownDays = 0;
  let activeDays = 0;
  for (const pair of pairs) {
    if (pair.tMin == null || pair.tMax == null) continue;
    const dailyGdd = calculateDailyGddSimpleAverage(pair.tMin, pair.tMax, baseTemperatureC, upperThresholdC);
    total += dailyGdd;
    knownDays += 1;
    if (dailyGdd > 0) activeDays += 1;
  }
  return { total, knownDays, activeDays, pairs };
}

export function calculateGdd(
  dailyMinTemps: DailyClimateValue[],
  dailyMaxTemps: DailyClimateValue[],
  config: GddCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'GDD';
  const formulaVersion = 'GDD_v1';
  const unitId = unitIdForCode('DEG_C_DAY');
  if (config.method !== 'SIMPLE_AVERAGE') {
    return insufficient(
      'GDD',
      formulaCode,
      formulaVersion,
      unitId,
      `GDD method "${config.method}" is not implemented in Phase 2.3A`,
      { method: config.method },
    );
  }
  if (config.baseTemperatureC == null) {
    return insufficient('GDD', formulaCode, formulaVersion, unitId, 'Base temperature not configured');
  }
  const { total, knownDays } = accumulateSimpleAverageGdd(
    dailyMinTemps,
    dailyMaxTemps,
    config.baseTemperatureC,
    config.upperThresholdC,
  );
  const coverage = buildCoverage(knownDays, config.periodStartDate, config.periodEndDate);
  if (knownDays === 0) {
    return insufficient(
      'GDD',
      formulaCode,
      formulaVersion,
      unitId,
      'No days with both T2M_MIN and T2M_MAX available',
      { baseTemperatureC: config.baseTemperatureC, upperThresholdC: config.upperThresholdC },
    );
  }
  return {
    indicatorCode: 'GDD',
    calculatedValue: total,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: { baseTemperatureC: config.baseTemperatureC, upperThresholdC: config.upperThresholdC },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

/** Reports the configured base temperature for traceability — not a computed statistic. */
export function calculateGddBaseTemperature(config: GddCalculationConfig): IndicatorCalculationOutcome {
  const formulaCode = 'GDD_BASE_TEMPERATURE';
  const formulaVersion = 'GDD_BASE_TEMPERATURE_v1';
  const unitId = unitIdForCode('DEG_C');
  if (config.baseTemperatureC == null) {
    return insufficient('GDD_BASE_TEMPERATURE', formulaCode, formulaVersion, unitId, 'Base temperature not configured');
  }
  return {
    indicatorCode: 'GDD_BASE_TEMPERATURE',
    calculatedValue: config.baseTemperatureC,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: { method: config.method },
    coverage: null,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculateActiveGrowingDayCount(
  dailyMinTemps: DailyClimateValue[],
  dailyMaxTemps: DailyClimateValue[],
  config: GddCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'ACTIVE_GROWING_DAY_COUNT';
  const formulaVersion = 'ACTIVE_GROWING_DAY_COUNT_v1';
  const unitId = unitIdForCode('DAY');
  if (config.method !== 'SIMPLE_AVERAGE') {
    return insufficient(
      'ACTIVE_GROWING_DAY_COUNT',
      formulaCode,
      formulaVersion,
      unitId,
      `GDD method "${config.method}" is not implemented in Phase 2.3A`,
      { method: config.method },
    );
  }
  if (config.baseTemperatureC == null) {
    return insufficient(
      'ACTIVE_GROWING_DAY_COUNT',
      formulaCode,
      formulaVersion,
      unitId,
      'Base temperature not configured',
    );
  }
  const { knownDays, activeDays } = accumulateSimpleAverageGdd(
    dailyMinTemps,
    dailyMaxTemps,
    config.baseTemperatureC,
    config.upperThresholdC,
  );
  const coverage = buildCoverage(knownDays, config.periodStartDate, config.periodEndDate);
  if (knownDays === 0) {
    return insufficient(
      'ACTIVE_GROWING_DAY_COUNT',
      formulaCode,
      formulaVersion,
      unitId,
      'No days with both T2M_MIN and T2M_MAX available',
      { baseTemperatureC: config.baseTemperatureC },
    );
  }
  return {
    indicatorCode: 'ACTIVE_GROWING_DAY_COUNT',
    calculatedValue: activeDays,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: { baseTemperatureC: config.baseTemperatureC, upperThresholdC: config.upperThresholdC },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculateGrowingSeasonStartDate(): IndicatorCalculationOutcome {
  return insufficient(
    'GROWING_SEASON_START_DATE',
    'GROWING_SEASON_START_DATE',
    'GROWING_SEASON_START_DATE_v1',
    null,
    'Growing season start-detection rule is not defined/implemented in Phase 2.3A',
  );
}

export function calculateGrowingSeasonEndDate(): IndicatorCalculationOutcome {
  return insufficient(
    'GROWING_SEASON_END_DATE',
    'GROWING_SEASON_END_DATE',
    'GROWING_SEASON_END_DATE_v1',
    null,
    'Growing season end-detection rule is not defined/implemented in Phase 2.3A',
  );
}

export function calculateGrowingSeasonLength(): IndicatorCalculationOutcome {
  return insufficient(
    'GROWING_SEASON_LENGTH',
    'GROWING_SEASON_LENGTH',
    'GROWING_SEASON_LENGTH_v1',
    unitIdForCode('DAY'),
    'Growing season length depends on start/end detection, which is not defined/implemented in Phase 2.3A',
  );
}

export function calculateAllGrowingSeasonIndicators(
  dailyMinTemps: DailyClimateValue[],
  dailyMaxTemps: DailyClimateValue[],
  config: GddCalculationConfig,
): IndicatorCalculationOutcome[] {
  return [
    calculateGdd(dailyMinTemps, dailyMaxTemps, config),
    calculateGddBaseTemperature(config),
    calculateGrowingSeasonStartDate(),
    calculateGrowingSeasonEndDate(),
    calculateGrowingSeasonLength(),
    calculateActiveGrowingDayCount(dailyMinTemps, dailyMaxTemps, config),
  ];
}
