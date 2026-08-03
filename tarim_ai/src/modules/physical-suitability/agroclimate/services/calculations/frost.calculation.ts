import { unitIdForCode } from '../../../soil-laboratory/catalogs/measurement-unit.catalog.js';
import type {
  AgroClimateCoverageSummary,
  DailyClimateValue,
  IndicatorCalculationOutcome,
} from '../../types/agroclimate.types.js';

/**
 * Phase 2.3A — Frost indicators (category FROST).
 * Pure functions: daily T2M_MIN values in, indicator outcomes out.
 * `frostThreshold === null` → INSUFFICIENT_DATA (never guess a threshold).
 */

export type FrostCalculationConfig = {
  /** °C — T2M_MIN <= threshold counts as a frost day. */
  frostThreshold: number | null;
  /** °C — stricter subset of frost days. */
  severeFrostThreshold: number | null;
  periodStartDate: string;
  periodEndDate: string;
};

export type FrostEvent = {
  startDate: string;
  endDate: string;
  durationDays: number;
};

function daysBetweenInclusive(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

function addDays(date: string, days: number): string {
  const ms = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

function calendarDayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

function buildCoverage(
  dailyMinTemps: DailyClimateValue[],
  periodStartDate: string,
  periodEndDate: string,
): AgroClimateCoverageSummary {
  const knownDays = dailyMinTemps.filter((d) => d.value != null).length;
  const expectedDays = daysBetweenInclusive(periodStartDate, periodEndDate);
  const missingDays = Math.max(0, expectedDays - knownDays);
  return {
    knownDays,
    expectedDays,
    missingDays,
    coverageRatio: expectedDays > 0 ? knownDays / expectedDays : null,
  };
}

function sortedKnown(dailyMinTemps: DailyClimateValue[]): DailyClimateValue[] {
  return dailyMinTemps
    .filter((d) => d.value != null)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Groups calendar-consecutive days at or below `threshold` into frost events.
 * A missing (unknown) day always breaks a run — it is never assumed frost or non-frost.
 */
export function groupFrostEvents(dailyMinTemps: DailyClimateValue[], threshold: number): FrostEvent[] {
  const known = sortedKnown(dailyMinTemps);
  const events: FrostEvent[] = [];
  let current: FrostEvent | null = null;
  for (const day of known) {
    const isFrost = (day.value as number) <= threshold;
    if (!isFrost) {
      current = null;
      continue;
    }
    if (current && calendarDayDiff(current.endDate, day.date) === 1) {
      current.endDate = day.date;
      current.durationDays += 1;
    } else {
      current = { startDate: day.date, endDate: day.date, durationDays: 1 };
      events.push(current);
    }
  }
  return events;
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

export function calculateFrostDayCount(
  dailyMinTemps: DailyClimateValue[],
  config: FrostCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'FROST_DAY_COUNT';
  const formulaVersion = 'FROST_DAY_COUNT_v1';
  const unitId = unitIdForCode('DAY');
  if (config.frostThreshold == null) {
    return insufficient('FROST_DAY_COUNT', formulaCode, formulaVersion, unitId, 'Frost threshold not configured', {
      frostThreshold: null,
    });
  }
  const coverage = buildCoverage(dailyMinTemps, config.periodStartDate, config.periodEndDate);
  if (coverage.knownDays === 0) {
    return insufficient(
      'FROST_DAY_COUNT',
      formulaCode,
      formulaVersion,
      unitId,
      'No T2M_MIN observations available in the analysis period',
      { frostThreshold: config.frostThreshold },
    );
  }
  const count = sortedKnown(dailyMinTemps).filter((d) => (d.value as number) <= config.frostThreshold!).length;
  return {
    indicatorCode: 'FROST_DAY_COUNT',
    calculatedValue: count,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: { frostThreshold: config.frostThreshold },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculateSevereFrostDayCount(
  dailyMinTemps: DailyClimateValue[],
  config: FrostCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'SEVERE_FROST_DAY_COUNT';
  const formulaVersion = 'SEVERE_FROST_DAY_COUNT_v1';
  const unitId = unitIdForCode('DAY');
  if (config.severeFrostThreshold == null) {
    return insufficient(
      'SEVERE_FROST_DAY_COUNT',
      formulaCode,
      formulaVersion,
      unitId,
      'Severe frost threshold not configured',
      { severeFrostThreshold: null },
    );
  }
  const coverage = buildCoverage(dailyMinTemps, config.periodStartDate, config.periodEndDate);
  if (coverage.knownDays === 0) {
    return insufficient(
      'SEVERE_FROST_DAY_COUNT',
      formulaCode,
      formulaVersion,
      unitId,
      'No T2M_MIN observations available in the analysis period',
      { severeFrostThreshold: config.severeFrostThreshold },
    );
  }
  const count = sortedKnown(dailyMinTemps).filter(
    (d) => (d.value as number) <= config.severeFrostThreshold!,
  ).length;
  return {
    indicatorCode: 'SEVERE_FROST_DAY_COUNT',
    calculatedValue: count,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: { severeFrostThreshold: config.severeFrostThreshold },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculateFrostEventCount(
  dailyMinTemps: DailyClimateValue[],
  config: FrostCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'FROST_EVENT_COUNT';
  const formulaVersion = 'FROST_EVENT_COUNT_v1';
  const unitId = unitIdForCode('NONE');
  if (config.frostThreshold == null) {
    return insufficient('FROST_EVENT_COUNT', formulaCode, formulaVersion, unitId, 'Frost threshold not configured');
  }
  const coverage = buildCoverage(dailyMinTemps, config.periodStartDate, config.periodEndDate);
  if (coverage.knownDays === 0) {
    return insufficient(
      'FROST_EVENT_COUNT',
      formulaCode,
      formulaVersion,
      unitId,
      'No T2M_MIN observations available in the analysis period',
    );
  }
  const events = groupFrostEvents(dailyMinTemps, config.frostThreshold);
  return {
    indicatorCode: 'FROST_EVENT_COUNT',
    calculatedValue: events.length,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: { frostThreshold: config.frostThreshold, events },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculateLongestFrostEventDays(
  dailyMinTemps: DailyClimateValue[],
  config: FrostCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'LONGEST_FROST_EVENT_DAYS';
  const formulaVersion = 'LONGEST_FROST_EVENT_DAYS_v1';
  const unitId = unitIdForCode('DAY');
  if (config.frostThreshold == null) {
    return insufficient(
      'LONGEST_FROST_EVENT_DAYS',
      formulaCode,
      formulaVersion,
      unitId,
      'Frost threshold not configured',
    );
  }
  const coverage = buildCoverage(dailyMinTemps, config.periodStartDate, config.periodEndDate);
  if (coverage.knownDays === 0) {
    return insufficient(
      'LONGEST_FROST_EVENT_DAYS',
      formulaCode,
      formulaVersion,
      unitId,
      'No T2M_MIN observations available in the analysis period',
    );
  }
  const events = groupFrostEvents(dailyMinTemps, config.frostThreshold);
  const maxDuration = events.reduce((max, e) => Math.max(max, e.durationDays), 0);
  return {
    indicatorCode: 'LONGEST_FROST_EVENT_DAYS',
    calculatedValue: maxDuration,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: { frostThreshold: config.frostThreshold, events },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

type SpringAutumnFrost = {
  lastSpringFrostDate: string | null;
  firstAutumnFrostDate: string | null;
};

/**
 * Splits the period at its midpoint: the latest frost day at or before the
 * midpoint is the "last spring frost"; the earliest frost day after the
 * midpoint is the "first autumn frost". Heuristic — no hemisphere/season
 * calendar is assumed beyond the analysis period itself.
 */
function findSpringAutumnFrost(
  dailyMinTemps: DailyClimateValue[],
  threshold: number,
  periodStartDate: string,
  periodEndDate: string,
): SpringAutumnFrost {
  const known = sortedKnown(dailyMinTemps);
  const frostDates = known.filter((d) => (d.value as number) <= threshold).map((d) => d.date);
  if (frostDates.length === 0) return { lastSpringFrostDate: null, firstAutumnFrostDate: null };
  const totalDays = daysBetweenInclusive(periodStartDate, periodEndDate);
  const midpointDate = addDays(periodStartDate, Math.floor(totalDays / 2));
  const springCandidates = frostDates.filter((d) => d <= midpointDate);
  const autumnCandidates = frostDates.filter((d) => d > midpointDate);
  return {
    lastSpringFrostDate: springCandidates.length ? springCandidates[springCandidates.length - 1]! : null,
    firstAutumnFrostDate: autumnCandidates.length ? autumnCandidates[0]! : null,
  };
}

export function calculateLastSpringFrostDate(
  dailyMinTemps: DailyClimateValue[],
  config: FrostCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'LAST_SPRING_FROST_DATE';
  const formulaVersion = 'LAST_SPRING_FROST_DATE_v1';
  if (config.frostThreshold == null) {
    return insufficient('LAST_SPRING_FROST_DATE', formulaCode, formulaVersion, null, 'Frost threshold not configured');
  }
  const coverage = buildCoverage(dailyMinTemps, config.periodStartDate, config.periodEndDate);
  if (coverage.knownDays === 0) {
    return insufficient(
      'LAST_SPRING_FROST_DATE',
      formulaCode,
      formulaVersion,
      null,
      'No T2M_MIN observations available in the analysis period',
    );
  }
  const { lastSpringFrostDate } = findSpringAutumnFrost(
    dailyMinTemps,
    config.frostThreshold,
    config.periodStartDate,
    config.periodEndDate,
  );
  if (lastSpringFrostDate == null) {
    return {
      indicatorCode: 'LAST_SPRING_FROST_DATE',
      calculatedValue: null,
      valueDate: null,
      unitId: null,
      formulaCode,
      formulaVersion,
      inputSummary: { frostThreshold: config.frostThreshold },
      coverage,
      calculationStatus: 'CALCULATED',
      calculationMessage: 'No frost day detected before the period midpoint',
    };
  }
  return {
    indicatorCode: 'LAST_SPRING_FROST_DATE',
    calculatedValue: null,
    valueDate: lastSpringFrostDate,
    unitId: null,
    formulaCode,
    formulaVersion,
    inputSummary: { frostThreshold: config.frostThreshold },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculateFirstAutumnFrostDate(
  dailyMinTemps: DailyClimateValue[],
  config: FrostCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'FIRST_AUTUMN_FROST_DATE';
  const formulaVersion = 'FIRST_AUTUMN_FROST_DATE_v1';
  if (config.frostThreshold == null) {
    return insufficient('FIRST_AUTUMN_FROST_DATE', formulaCode, formulaVersion, null, 'Frost threshold not configured');
  }
  const coverage = buildCoverage(dailyMinTemps, config.periodStartDate, config.periodEndDate);
  if (coverage.knownDays === 0) {
    return insufficient(
      'FIRST_AUTUMN_FROST_DATE',
      formulaCode,
      formulaVersion,
      null,
      'No T2M_MIN observations available in the analysis period',
    );
  }
  const { firstAutumnFrostDate } = findSpringAutumnFrost(
    dailyMinTemps,
    config.frostThreshold,
    config.periodStartDate,
    config.periodEndDate,
  );
  if (firstAutumnFrostDate == null) {
    return {
      indicatorCode: 'FIRST_AUTUMN_FROST_DATE',
      calculatedValue: null,
      valueDate: null,
      unitId: null,
      formulaCode,
      formulaVersion,
      inputSummary: { frostThreshold: config.frostThreshold },
      coverage,
      calculationStatus: 'CALCULATED',
      calculationMessage: 'No frost day detected after the period midpoint',
    };
  }
  return {
    indicatorCode: 'FIRST_AUTUMN_FROST_DATE',
    calculatedValue: null,
    valueDate: firstAutumnFrostDate,
    unitId: null,
    formulaCode,
    formulaVersion,
    inputSummary: { frostThreshold: config.frostThreshold },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculateFrostFreePeriodDays(
  dailyMinTemps: DailyClimateValue[],
  config: FrostCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'FROST_FREE_PERIOD_DAYS';
  const formulaVersion = 'FROST_FREE_PERIOD_DAYS_v1';
  const unitId = unitIdForCode('DAY');
  if (config.frostThreshold == null) {
    return insufficient(
      'FROST_FREE_PERIOD_DAYS',
      formulaCode,
      formulaVersion,
      unitId,
      'Frost threshold not configured',
    );
  }
  const coverage = buildCoverage(dailyMinTemps, config.periodStartDate, config.periodEndDate);
  if (coverage.knownDays === 0) {
    return insufficient(
      'FROST_FREE_PERIOD_DAYS',
      formulaCode,
      formulaVersion,
      unitId,
      'No T2M_MIN observations available in the analysis period',
    );
  }
  const { lastSpringFrostDate, firstAutumnFrostDate } = findSpringAutumnFrost(
    dailyMinTemps,
    config.frostThreshold,
    config.periodStartDate,
    config.periodEndDate,
  );
  const inputSummary = { frostThreshold: config.frostThreshold, lastSpringFrostDate, firstAutumnFrostDate };
  if (lastSpringFrostDate == null && firstAutumnFrostDate == null) {
    return {
      indicatorCode: 'FROST_FREE_PERIOD_DAYS',
      calculatedValue: coverage.expectedDays,
      valueDate: null,
      unitId,
      formulaCode,
      formulaVersion,
      inputSummary,
      coverage,
      calculationStatus: 'CALCULATED',
      calculationMessage: 'No frost days detected in the analysis period; length equals full period',
    };
  }
  if (lastSpringFrostDate == null || firstAutumnFrostDate == null) {
    return {
      indicatorCode: 'FROST_FREE_PERIOD_DAYS',
      calculatedValue: null,
      valueDate: null,
      unitId,
      formulaCode,
      formulaVersion,
      inputSummary,
      coverage,
      calculationStatus: 'REQUIRES_REVIEW',
      calculationMessage:
        'Only one boundary frost date could be determined (spring or autumn); frost-free length is ambiguous',
    };
  }
  const length = calendarDayDiff(lastSpringFrostDate, firstAutumnFrostDate) - 1;
  return {
    indicatorCode: 'FROST_FREE_PERIOD_DAYS',
    calculatedValue: Math.max(0, length),
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary,
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculateAllFrostIndicators(
  dailyMinTemps: DailyClimateValue[],
  config: FrostCalculationConfig,
): IndicatorCalculationOutcome[] {
  return [
    calculateFrostDayCount(dailyMinTemps, config),
    calculateSevereFrostDayCount(dailyMinTemps, config),
    calculateFrostEventCount(dailyMinTemps, config),
    calculateLongestFrostEventDays(dailyMinTemps, config),
    calculateLastSpringFrostDate(dailyMinTemps, config),
    calculateFirstAutumnFrostDate(dailyMinTemps, config),
    calculateFrostFreePeriodDays(dailyMinTemps, config),
  ];
}
