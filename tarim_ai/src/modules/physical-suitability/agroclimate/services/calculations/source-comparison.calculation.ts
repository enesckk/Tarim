import type {
  ClimateSourceComparison,
  ComparisonStatus,
  DailyClimateValue,
  ParameterCode,
} from '../../types/agroclimate.types.js';

/**
 * Phase 2.3A — Cross-source climate comparison.
 * Reports raw statistics only (mean absolute/percentage difference, record
 * counts, optional correlation). CONSISTENT / MINOR_DIFFERENCE / MAJOR_DIFFERENCE
 * exist in the schema but are never assigned automatically here — no
 * agreement/consistency threshold has been scientifically defined for Phase
 * 2.3A, so comparisons that have data are always REQUIRES_REVIEW so a human
 * (or a future config-driven rule) decides the classification.
 */

export type SourceComparisonInput = {
  parameterCode: ParameterCode;
  primaryValues: DailyClimateValue[];
  secondaryValues: DailyClimateValue[];
};

export type SourceComparisonOutcome = {
  parameterCode: ParameterCode;
  primaryRecordCount: number;
  secondaryRecordCount: number;
  pairedRecordCount: number;
  meanAbsoluteDifference: number | null;
  percentageDifference: number | null;
  correlationValue: number | null;
  comparisonStatus: ComparisonStatus;
  notes: string | null;
};

/** Pearson correlation coefficient. Returns null for fewer than 2 pairs or zero variance. */
export function calculatePearsonCorrelation(pairs: Array<[number, number]>): number | null {
  if (pairs.length < 2) return null;
  const n = pairs.length;
  const sumX = pairs.reduce((s, [x]) => s + x, 0);
  const sumY = pairs.reduce((s, [, y]) => s + y, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;
  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;
  for (const [x, y] of pairs) {
    const dx = x - meanX;
    const dy = y - meanY;
    numerator += dx * dy;
    sumSqX += dx * dx;
    sumSqY += dy * dy;
  }
  const denominator = Math.sqrt(sumSqX * sumSqY);
  if (denominator === 0) return null;
  return numerator / denominator;
}

function emptyOutcome(
  parameterCode: ParameterCode,
  comparisonStatus: ComparisonStatus,
  notes: string,
  primaryRecordCount = 0,
  secondaryRecordCount = 0,
): SourceComparisonOutcome {
  return {
    parameterCode,
    primaryRecordCount,
    secondaryRecordCount,
    pairedRecordCount: 0,
    meanAbsoluteDifference: null,
    percentageDifference: null,
    correlationValue: null,
    comparisonStatus,
    notes,
  };
}

export function compareClimateSources(input: SourceComparisonInput): SourceComparisonOutcome {
  const primaryKnown = input.primaryValues.filter((v) => v.value != null);
  const secondaryKnown = input.secondaryValues.filter((v) => v.value != null);
  if (primaryKnown.length === 0 || secondaryKnown.length === 0) {
    return emptyOutcome(
      input.parameterCode,
      'INSUFFICIENT_DATA',
      'One or both data sources have no observations for this parameter/period',
      primaryKnown.length,
      secondaryKnown.length,
    );
  }
  const secondaryByDate = new Map(secondaryKnown.map((v) => [v.date, v.value as number]));
  const pairs: Array<{ date: string; primary: number; secondary: number }> = [];
  for (const p of primaryKnown) {
    const s = secondaryByDate.get(p.date);
    if (s != null) pairs.push({ date: p.date, primary: p.value as number, secondary: s });
  }
  if (pairs.length === 0) {
    return emptyOutcome(
      input.parameterCode,
      'INSUFFICIENT_DATA',
      'No overlapping observation dates between the two sources',
      primaryKnown.length,
      secondaryKnown.length,
    );
  }
  const absDiffs = pairs.map((p) => Math.abs(p.primary - p.secondary));
  const meanAbsoluteDifference = absDiffs.reduce((s, v) => s + v, 0) / pairs.length;
  const pctDiffs = pairs
    .filter((p) => p.primary !== 0)
    .map((p) => (100 * Math.abs(p.primary - p.secondary)) / Math.abs(p.primary));
  const percentageDifference = pctDiffs.length ? pctDiffs.reduce((s, v) => s + v, 0) / pctDiffs.length : null;
  const correlationValue = calculatePearsonCorrelation(pairs.map((p) => [p.primary, p.secondary]));
  return {
    parameterCode: input.parameterCode,
    primaryRecordCount: primaryKnown.length,
    secondaryRecordCount: secondaryKnown.length,
    pairedRecordCount: pairs.length,
    meanAbsoluteDifference,
    percentageDifference,
    correlationValue,
    comparisonStatus: 'REQUIRES_REVIEW',
    notes: 'Automated statistical comparison only; no agreement/consistency threshold applied — requires expert review',
  };
}

export function buildClimateSourceComparison(opts: {
  id: string;
  parcelId: string;
  primarySourceId: string;
  secondarySourceId: string;
  periodStart: string;
  periodEnd: string;
  outcome: SourceComparisonOutcome;
  now: string;
  version?: number;
}): ClimateSourceComparison {
  return {
    id: opts.id,
    parcelId: opts.parcelId,
    parameterCode: opts.outcome.parameterCode,
    periodStart: opts.periodStart,
    periodEnd: opts.periodEnd,
    primarySourceId: opts.primarySourceId,
    secondarySourceId: opts.secondarySourceId,
    primaryRecordCount: opts.outcome.primaryRecordCount,
    secondaryRecordCount: opts.outcome.secondaryRecordCount,
    meanAbsoluteDifference: opts.outcome.meanAbsoluteDifference,
    percentageDifference: opts.outcome.percentageDifference,
    correlationValue: opts.outcome.correlationValue,
    comparisonStatus: opts.outcome.comparisonStatus,
    notes: opts.outcome.notes,
    createdAt: opts.now,
    version: opts.version ?? 1,
  };
}
