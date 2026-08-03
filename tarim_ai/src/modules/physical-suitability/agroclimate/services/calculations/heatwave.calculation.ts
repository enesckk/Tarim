import { unitIdForCode } from '../../../soil-laboratory/catalogs/measurement-unit.catalog.js';
import type {
  AgroClimateCoverageSummary,
  DailyClimateValue,
  IndicatorCalculationOutcome,
} from '../../types/agroclimate.types.js';

/**
 * Phase 2.3A — Heat / heatwave indicators (category HEAT).
 * Requires extremeHeatThreshold and heatwaveMinimumDurationDays from config for
 * heatwave-specific indicators; missing config → INSUFFICIENT_DATA.
 */

export type HeatwaveCalculationConfig = {
  /** °C — T2M_MAX >= threshold counts as an extreme heat day. */
  extremeHeatThreshold: number | null;
  /** Minimum consecutive extreme-heat days to qualify as a heatwave event. */
  heatwaveMinimumDurationDays: number | null;
  /** °C — T2M_MIN >= threshold counts toward HIGH_NIGHT_TEMPERATURE_COUNT. */
  highNightTemperatureThreshold: number | null;
  periodStartDate: string;
  periodEndDate: string;
};

export type HeatEvent = {
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

function calendarDayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
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

/** Groups calendar-consecutive days meeting/exceeding `threshold` into events. Missing days break a run. */
export function groupHeatEvents(dailyValues: DailyClimateValue[], threshold: number): HeatEvent[] {
  const known = sortedKnown(dailyValues);
  const events: HeatEvent[] = [];
  let current: HeatEvent | null = null;
  for (const day of known) {
    const isHot = (day.value as number) >= threshold;
    if (!isHot) {
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

export function calculateExtremeHeatDayCount(
  dailyMaxTemps: DailyClimateValue[],
  config: HeatwaveCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'EXTREME_HEAT_DAY_COUNT';
  const formulaVersion = 'EXTREME_HEAT_DAY_COUNT_v1';
  const unitId = unitIdForCode('DAY');
  if (config.extremeHeatThreshold == null) {
    return insufficient(
      'EXTREME_HEAT_DAY_COUNT',
      formulaCode,
      formulaVersion,
      unitId,
      'Extreme heat threshold not configured',
    );
  }
  const coverage = buildCoverage(dailyMaxTemps, config.periodStartDate, config.periodEndDate);
  if (coverage.knownDays === 0) {
    return insufficient(
      'EXTREME_HEAT_DAY_COUNT',
      formulaCode,
      formulaVersion,
      unitId,
      'No T2M_MAX observations available in the analysis period',
    );
  }
  const count = sortedKnown(dailyMaxTemps).filter(
    (d) => (d.value as number) >= config.extremeHeatThreshold!,
  ).length;
  return {
    indicatorCode: 'EXTREME_HEAT_DAY_COUNT',
    calculatedValue: count,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: { extremeHeatThreshold: config.extremeHeatThreshold },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

function qualifyingHeatwaveEvents(events: HeatEvent[], minimumDurationDays: number): HeatEvent[] {
  return events.filter((e) => e.durationDays >= minimumDurationDays);
}

export function calculateHeatwaveEventCount(
  dailyMaxTemps: DailyClimateValue[],
  config: HeatwaveCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'HEATWAVE_EVENT_COUNT';
  const formulaVersion = 'HEATWAVE_EVENT_COUNT_v1';
  const unitId = unitIdForCode('NONE');
  if (config.extremeHeatThreshold == null || config.heatwaveMinimumDurationDays == null) {
    return insufficient(
      'HEATWAVE_EVENT_COUNT',
      formulaCode,
      formulaVersion,
      unitId,
      'Extreme heat threshold and/or heatwave minimum duration not configured',
    );
  }
  const coverage = buildCoverage(dailyMaxTemps, config.periodStartDate, config.periodEndDate);
  if (coverage.knownDays === 0) {
    return insufficient(
      'HEATWAVE_EVENT_COUNT',
      formulaCode,
      formulaVersion,
      unitId,
      'No T2M_MAX observations available in the analysis period',
    );
  }
  const events = groupHeatEvents(dailyMaxTemps, config.extremeHeatThreshold);
  const qualifying = qualifyingHeatwaveEvents(events, config.heatwaveMinimumDurationDays);
  return {
    indicatorCode: 'HEATWAVE_EVENT_COUNT',
    calculatedValue: qualifying.length,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: {
      extremeHeatThreshold: config.extremeHeatThreshold,
      heatwaveMinimumDurationDays: config.heatwaveMinimumDurationDays,
      qualifyingEvents: qualifying,
    },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculateLongestHeatwaveDays(
  dailyMaxTemps: DailyClimateValue[],
  config: HeatwaveCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'LONGEST_HEATWAVE_DAYS';
  const formulaVersion = 'LONGEST_HEATWAVE_DAYS_v1';
  const unitId = unitIdForCode('DAY');
  if (config.extremeHeatThreshold == null || config.heatwaveMinimumDurationDays == null) {
    return insufficient(
      'LONGEST_HEATWAVE_DAYS',
      formulaCode,
      formulaVersion,
      unitId,
      'Extreme heat threshold and/or heatwave minimum duration not configured',
    );
  }
  const coverage = buildCoverage(dailyMaxTemps, config.periodStartDate, config.periodEndDate);
  if (coverage.knownDays === 0) {
    return insufficient(
      'LONGEST_HEATWAVE_DAYS',
      formulaCode,
      formulaVersion,
      unitId,
      'No T2M_MAX observations available in the analysis period',
    );
  }
  const events = groupHeatEvents(dailyMaxTemps, config.extremeHeatThreshold);
  const qualifying = qualifyingHeatwaveEvents(events, config.heatwaveMinimumDurationDays);
  const maxDuration = qualifying.reduce((max, e) => Math.max(max, e.durationDays), 0);
  return {
    indicatorCode: 'LONGEST_HEATWAVE_DAYS',
    calculatedValue: maxDuration,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: {
      extremeHeatThreshold: config.extremeHeatThreshold,
      heatwaveMinimumDurationDays: config.heatwaveMinimumDurationDays,
      qualifyingEvents: qualifying,
    },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

/**
 * Highest T2M_MAX observed among days belonging to a qualifying heatwave event.
 * `null` calculatedValue with CALCULATED status means the period had no
 * qualifying heatwave (not an error — simply nothing to report).
 */
export function calculateMaximumHeatwaveTemperature(
  dailyMaxTemps: DailyClimateValue[],
  config: HeatwaveCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'MAXIMUM_HEATWAVE_TEMPERATURE';
  const formulaVersion = 'MAXIMUM_HEATWAVE_TEMPERATURE_v1';
  const unitId = unitIdForCode('DEG_C');
  if (config.extremeHeatThreshold == null || config.heatwaveMinimumDurationDays == null) {
    return insufficient(
      'MAXIMUM_HEATWAVE_TEMPERATURE',
      formulaCode,
      formulaVersion,
      unitId,
      'Extreme heat threshold and/or heatwave minimum duration not configured',
    );
  }
  const coverage = buildCoverage(dailyMaxTemps, config.periodStartDate, config.periodEndDate);
  if (coverage.knownDays === 0) {
    return insufficient(
      'MAXIMUM_HEATWAVE_TEMPERATURE',
      formulaCode,
      formulaVersion,
      unitId,
      'No T2M_MAX observations available in the analysis period',
    );
  }
  const events = groupHeatEvents(dailyMaxTemps, config.extremeHeatThreshold);
  const qualifying = qualifyingHeatwaveEvents(events, config.heatwaveMinimumDurationDays);
  const qualifyingDates = new Set<string>();
  for (const event of qualifying) {
    let cursor = event.startDate;
    while (cursor <= event.endDate) {
      qualifyingDates.add(cursor);
      cursor = new Date(Date.parse(`${cursor}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    }
  }
  const known = sortedKnown(dailyMaxTemps).filter((d) => qualifyingDates.has(d.date));
  if (known.length === 0) {
    return {
      indicatorCode: 'MAXIMUM_HEATWAVE_TEMPERATURE',
      calculatedValue: null,
      valueDate: null,
      unitId,
      formulaCode,
      formulaVersion,
      inputSummary: {
        extremeHeatThreshold: config.extremeHeatThreshold,
        heatwaveMinimumDurationDays: config.heatwaveMinimumDurationDays,
      },
      coverage,
      calculationStatus: 'CALCULATED',
      calculationMessage: 'No qualifying heatwave events in the analysis period',
    };
  }
  const max = known.reduce((m, d) => Math.max(m, d.value as number), -Infinity);
  const maxDay = known.find((d) => d.value === max) ?? null;
  return {
    indicatorCode: 'MAXIMUM_HEATWAVE_TEMPERATURE',
    calculatedValue: max,
    valueDate: maxDay ? maxDay.date : null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: {
      extremeHeatThreshold: config.extremeHeatThreshold,
      heatwaveMinimumDurationDays: config.heatwaveMinimumDurationDays,
      qualifyingEvents: qualifying,
    },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

/**
 * Uses T2M_MIN vs the dedicated night-temperature threshold when configured.
 * If that threshold is absent, falls back to `extremeHeatThreshold` but flags
 * the result REQUIRES_REVIEW since reusing a daytime threshold for night
 * temperatures is not scientifically validated.
 */
export function calculateHighNightTemperatureCount(
  dailyMinTemps: DailyClimateValue[],
  config: HeatwaveCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'HIGH_NIGHT_TEMPERATURE_COUNT';
  const formulaVersion = 'HIGH_NIGHT_TEMPERATURE_COUNT_v1';
  const unitId = unitIdForCode('DAY');
  const dedicatedThreshold = config.highNightTemperatureThreshold;
  const fallbackThreshold = config.extremeHeatThreshold;
  if (dedicatedThreshold == null && fallbackThreshold == null) {
    return insufficient(
      'HIGH_NIGHT_TEMPERATURE_COUNT',
      formulaCode,
      formulaVersion,
      unitId,
      'Night temperature threshold not configured',
    );
  }
  const coverage = buildCoverage(dailyMinTemps, config.periodStartDate, config.periodEndDate);
  if (coverage.knownDays === 0) {
    return insufficient(
      'HIGH_NIGHT_TEMPERATURE_COUNT',
      formulaCode,
      formulaVersion,
      unitId,
      'No T2M_MIN observations available in the analysis period',
    );
  }
  const usingFallback = dedicatedThreshold == null;
  const threshold = (dedicatedThreshold ?? fallbackThreshold)!;
  const count = sortedKnown(dailyMinTemps).filter((d) => (d.value as number) >= threshold).length;
  return {
    indicatorCode: 'HIGH_NIGHT_TEMPERATURE_COUNT',
    calculatedValue: count,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: {
      thresholdUsed: threshold,
      highNightTemperatureThresholdConfigured: dedicatedThreshold,
      fallbackToExtremeHeatThreshold: usingFallback,
    },
    coverage,
    calculationStatus: usingFallback ? 'REQUIRES_REVIEW' : 'CALCULATED',
    calculationMessage: usingFallback
      ? 'No dedicated night-temperature threshold configured; falling back to extremeHeatThreshold — requires expert review'
      : null,
  };
}

export function calculateAllHeatwaveIndicators(
  dailyMaxTemps: DailyClimateValue[],
  dailyMinTemps: DailyClimateValue[],
  config: HeatwaveCalculationConfig,
): IndicatorCalculationOutcome[] {
  return [
    calculateExtremeHeatDayCount(dailyMaxTemps, config),
    calculateHeatwaveEventCount(dailyMaxTemps, config),
    calculateLongestHeatwaveDays(dailyMaxTemps, config),
    calculateMaximumHeatwaveTemperature(dailyMaxTemps, config),
    calculateHighNightTemperatureCount(dailyMinTemps, config),
  ];
}
