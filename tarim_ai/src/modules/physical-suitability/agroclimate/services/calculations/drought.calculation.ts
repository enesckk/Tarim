import { unitIdForCode } from '../../../soil-laboratory/catalogs/measurement-unit.catalog.js';
import type {
  AgroClimateCoverageSummary,
  DailyClimateValue,
  IndicatorCalculationOutcome,
} from '../../types/agroclimate.types.js';

/**
 * Phase 2.3A — Drought indicators (category DROUGHT).
 * Dry-spell grouping shares the "missing days break the run, never assumed
 * dry" rule used across every event-based indicator in this module.
 * PRECIPITATION_DEFICIT (baseline-relative) and METEOROLOGICAL_DROUGHT_INDEX
 * (climatology-relative) require methodologies not defined in Phase 2.3A and
 * always report INSUFFICIENT_DATA — never guessed.
 */

export type DroughtCalculationConfig = {
  /** mm — daily precipitation < threshold counts as a dry day. */
  dryDayThreshold: number | null;
  periodStartDate: string;
  periodEndDate: string;
};

export type DrySpell = {
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

/**
 * Groups calendar-consecutive dry days (precipitation < threshold) into spells.
 * A missing day is never assumed dry — it always breaks the current run.
 */
export function groupDrySpells(dailyPrecip: DailyClimateValue[], threshold: number): DrySpell[] {
  const known = sortedKnown(dailyPrecip);
  const spells: DrySpell[] = [];
  let current: DrySpell | null = null;
  for (const day of known) {
    const isDry = (day.value as number) < threshold;
    if (!isDry) {
      current = null;
      continue;
    }
    if (current && calendarDayDiff(current.endDate, day.date) === 1) {
      current.endDate = day.date;
      current.durationDays += 1;
    } else {
      current = { startDate: day.date, endDate: day.date, durationDays: 1 };
      spells.push(current);
    }
  }
  return spells;
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

/** Shared longest-dry-spell computation used by both CONSECUTIVE_DRY_DAYS and LONGEST_DRY_SPELL. */
function longestDrySpellOutcome(
  indicatorCode: IndicatorCalculationOutcome['indicatorCode'],
  formulaCode: string,
  formulaVersion: string,
  dailyPrecip: DailyClimateValue[],
  config: DroughtCalculationConfig,
): IndicatorCalculationOutcome {
  const unitId = unitIdForCode('DAY');
  if (config.dryDayThreshold == null) {
    return insufficient(indicatorCode, formulaCode, formulaVersion, unitId, 'Dry-day threshold not configured');
  }
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
  const spells = groupDrySpells(dailyPrecip, config.dryDayThreshold);
  const longest = spells.reduce<DrySpell | null>(
    (best, spell) => (best == null || spell.durationDays > best.durationDays ? spell : best),
    null,
  );
  return {
    indicatorCode,
    calculatedValue: longest ? longest.durationDays : 0,
    valueDate: longest ? longest.startDate : null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: { dryDayThreshold: config.dryDayThreshold, longestSpell: longest, spellCount: spells.length },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

/** Classic CDD-style climate index: the longest run of consecutive dry days in the period. */
export function calculateConsecutiveDryDays(
  dailyPrecip: DailyClimateValue[],
  config: DroughtCalculationConfig,
): IndicatorCalculationOutcome {
  return longestDrySpellOutcome(
    'CONSECUTIVE_DRY_DAYS',
    'CONSECUTIVE_DRY_DAYS',
    'CONSECUTIVE_DRY_DAYS_v1',
    dailyPrecip,
    config,
  );
}

/** Same underlying duration as CONSECUTIVE_DRY_DAYS, exposed as a discrete event (see valueDate/inputSummary). */
export function calculateLongestDrySpell(
  dailyPrecip: DailyClimateValue[],
  config: DroughtCalculationConfig,
): IndicatorCalculationOutcome {
  return longestDrySpellOutcome('LONGEST_DRY_SPELL', 'LONGEST_DRY_SPELL', 'LONGEST_DRY_SPELL_v1', dailyPrecip, config);
}

export function calculateDrySpellEventCount(
  dailyPrecip: DailyClimateValue[],
  config: DroughtCalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'DRY_SPELL_EVENT_COUNT';
  const formulaVersion = 'DRY_SPELL_EVENT_COUNT_v1';
  const unitId = unitIdForCode('NONE');
  if (config.dryDayThreshold == null) {
    return insufficient('DRY_SPELL_EVENT_COUNT', formulaCode, formulaVersion, unitId, 'Dry-day threshold not configured');
  }
  const coverage = buildCoverage(dailyPrecip, config.periodStartDate, config.periodEndDate);
  if (coverage.knownDays === 0) {
    return insufficient(
      'DRY_SPELL_EVENT_COUNT',
      formulaCode,
      formulaVersion,
      unitId,
      'No PRECIPITATION observations available in the analysis period',
    );
  }
  const spells = groupDrySpells(dailyPrecip, config.dryDayThreshold);
  return {
    indicatorCode: 'DRY_SPELL_EVENT_COUNT',
    calculatedValue: spells.length,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: { dryDayThreshold: config.dryDayThreshold, spells },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculatePrecipitationDeficit(): IndicatorCalculationOutcome {
  return insufficient(
    'PRECIPITATION_DEFICIT',
    'PRECIPITATION_DEFICIT',
    'PRECIPITATION_DEFICIT_v1',
    unitIdForCode('MM'),
    'Baseline-relative precipitation deficit methodology is not defined/implemented in Phase 2.3A',
  );
}

export function calculateMeteorologicalDroughtIndex(): IndicatorCalculationOutcome {
  return insufficient(
    'METEOROLOGICAL_DROUGHT_INDEX',
    'METEOROLOGICAL_DROUGHT_INDEX',
    'METEOROLOGICAL_DROUGHT_INDEX_v1',
    unitIdForCode('NONE'),
    'Standardized drought index requires a multi-year climatology baseline not available in Phase 2.3A',
  );
}

export function calculateAllDroughtIndicators(
  dailyPrecip: DailyClimateValue[],
  config: DroughtCalculationConfig,
): IndicatorCalculationOutcome[] {
  return [
    calculateConsecutiveDryDays(dailyPrecip, config),
    calculateLongestDrySpell(dailyPrecip, config),
    calculateDrySpellEventCount(dailyPrecip, config),
    calculatePrecipitationDeficit(),
    calculateMeteorologicalDroughtIndex(),
  ];
}
