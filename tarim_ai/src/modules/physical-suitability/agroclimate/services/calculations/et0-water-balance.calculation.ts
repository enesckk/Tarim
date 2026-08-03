import { unitIdForCode } from '../../../soil-laboratory/catalogs/measurement-unit.catalog.js';
import type {
  AgroClimateCoverageSummary,
  DailyClimateValue,
  ET0CalculationMethod,
  IndicatorCalculationOutcome,
} from '../../types/agroclimate.types.js';

/**
 * Phase 2.3A — Reference evapotranspiration (ET0) and water-balance indicators
 * (categories EVAPOTRANSPIRATION and WATER_BALANCE).
 * NO crop coefficient (Kc) is applied anywhere in this file — all outputs are
 * reference-level, not crop-specific water use.
 *
 * - SOURCE_PROVIDED: use REFERENCE_ET observations as-is.
 * - HARGREAVES_SAMANI: basic 1985 formula; requires Tmin, Tmax and latitude.
 * - FAO_PENMAN_MONTEITH: INSUFFICIENT_DATA (interface stub only — see
 *   `FaoPenmanMonteithInputs`), never guessed.
 */

export type Et0CalculationConfig = {
  method: ET0CalculationMethod;
  /** Decimal degrees — required for Hargreaves–Samani. */
  latitudeDegrees: number | null;
  periodStartDate: string;
  periodEndDate: string;
};

/**
 * Stub for a future FAO-56 Penman–Monteith implementation (Phase 2.3B+).
 * Not implemented — declared so downstream code can type-check against the
 * eventual required inputs without guessing at a formula today.
 */
export interface FaoPenmanMonteithInputs {
  date: string;
  tMean: number;
  tMin: number;
  tMax: number;
  relativeHumidityMean: number;
  windSpeed: number;
  solarRadiation: number;
  latitudeDegrees: number;
  elevationMeters: number;
}

function daysBetweenInclusive(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

function dayOfYear(date: string): number {
  const d = new Date(`${date}T00:00:00Z`);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / 86_400_000) + 1;
}

/** Extraterrestrial radiation Ra (MJ/m²/day) — FAO-56 eq. 21. */
export function calculateExtraterrestrialRadiation(latitudeDegrees: number, dayOfYearValue: number): number {
  const latRad = (latitudeDegrees * Math.PI) / 180;
  const solarConstant = 0.082; // MJ/m²/min
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * dayOfYearValue) / 365);
  const delta = 0.409 * Math.sin((2 * Math.PI * dayOfYearValue) / 365 - 1.39);
  const sunsetHourAngleArg = -Math.tan(latRad) * Math.tan(delta);
  const clamped = Math.max(-1, Math.min(1, sunsetHourAngleArg));
  const ws = Math.acos(clamped);
  return (
    ((24 * 60) / Math.PI) *
    solarConstant *
    dr *
    (ws * Math.sin(latRad) * Math.sin(delta) + Math.cos(latRad) * Math.cos(delta) * Math.sin(ws))
  );
}

/** Hargreaves–Samani (1985) daily ET0 in mm/day. */
export function calculateHargreavesSamaniDailyEt0(
  tMin: number,
  tMax: number,
  latitudeDegrees: number,
  date: string,
): number | null {
  if (tMax < tMin) return null;
  const ra = calculateExtraterrestrialRadiation(latitudeDegrees, dayOfYear(date));
  const raMm = 0.408 * ra;
  const tMean = (tMin + tMax) / 2;
  return 0.0023 * (tMean + 17.8) * Math.sqrt(tMax - tMin) * raMm;
}

type Merged = { date: string; tMin: number | null; tMax: number | null };

function mergeMinMax(dailyMinTemps: DailyClimateValue[], dailyMaxTemps: DailyClimateValue[]): Merged[] {
  const byDate = new Map<string, Merged>();
  for (const d of dailyMinTemps) byDate.set(d.date, { date: d.date, tMin: d.value, tMax: byDate.get(d.date)?.tMax ?? null });
  for (const d of dailyMaxTemps) {
    const existing = byDate.get(d.date);
    byDate.set(d.date, { date: d.date, tMin: existing?.tMin ?? null, tMax: d.value });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
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

/**
 * Produces a per-day ET0 series according to the configured method.
 * Returns `null` per-day where ET0 cannot be determined (never guessed).
 * `overallStatus` reflects whether the whole series is unusable (e.g. method
 * not implemented / not configured) as opposed to merely incomplete.
 */
export function computeDailyEt0Series(
  dailyMinTemps: DailyClimateValue[],
  dailyMaxTemps: DailyClimateValue[],
  dailyReferenceEt: DailyClimateValue[],
  config: Et0CalculationConfig,
): { series: DailyClimateValue[]; overallStatus: 'ok' | 'not_implemented' | 'not_configured'; message: string | null } {
  if (config.method === 'SOURCE_PROVIDED') {
    return { series: dailyReferenceEt, overallStatus: 'ok', message: null };
  }
  if (config.method === 'HARGREAVES_SAMANI') {
    if (config.latitudeDegrees == null) {
      return {
        series: [],
        overallStatus: 'ok',
        message: 'Latitude not configured; required for Hargreaves-Samani',
      };
    }
    const merged = mergeMinMax(dailyMinTemps, dailyMaxTemps);
    const series: DailyClimateValue[] = merged.map((m) => {
      if (m.tMin == null || m.tMax == null) return { date: m.date, value: null };
      const et0 = calculateHargreavesSamaniDailyEt0(m.tMin, m.tMax, config.latitudeDegrees!, m.date);
      return { date: m.date, value: et0 };
    });
    return { series, overallStatus: 'ok', message: null };
  }
  if (config.method === 'FAO_PENMAN_MONTEITH') {
    return {
      series: [],
      overallStatus: 'not_implemented',
      message:
        'FAO-56 Penman-Monteith requires wind speed, humidity and solar radiation inputs not yet wired in Phase 2.3A (see FaoPenmanMonteithInputs stub)',
    };
  }
  return { series: [], overallStatus: 'not_configured', message: 'ET0 calculation method not configured' };
}

function seriesOutcome(
  indicatorCode: IndicatorCalculationOutcome['indicatorCode'],
  formulaCode: string,
  formulaVersion: string,
  unitId: string | null,
  config: Et0CalculationConfig,
  seriesResult: ReturnType<typeof computeDailyEt0Series>,
  reducer: (known: number[]) => number,
): IndicatorCalculationOutcome {
  if (seriesResult.overallStatus === 'not_implemented') {
    return insufficient(indicatorCode, formulaCode, formulaVersion, unitId, seriesResult.message ?? 'Not implemented');
  }
  if (seriesResult.overallStatus === 'not_configured') {
    return insufficient(indicatorCode, formulaCode, formulaVersion, unitId, seriesResult.message ?? 'Not configured', {
      method: config.method,
    });
  }
  const known = seriesResult.series.filter((d) => d.value != null).map((d) => d.value as number);
  const coverage = buildCoverage(known.length, config.periodStartDate, config.periodEndDate);
  if (known.length === 0) {
    return insufficient(
      indicatorCode,
      formulaCode,
      formulaVersion,
      unitId,
      seriesResult.message ?? 'No ET0 values could be determined for the analysis period',
      { method: config.method, latitudeDegrees: config.latitudeDegrees },
    );
  }
  return {
    indicatorCode,
    calculatedValue: reducer(known),
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: { method: config.method, latitudeDegrees: config.latitudeDegrees },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

function formulaVersionForMethod(base: string, method: ET0CalculationMethod): string {
  if (method === 'HARGREAVES_SAMANI') return `${base}_HARGREAVES_SAMANI_v1`;
  return `${base}_v1`;
}

export function calculateReferenceEvapotranspiration(
  dailyMinTemps: DailyClimateValue[],
  dailyMaxTemps: DailyClimateValue[],
  dailyReferenceEt: DailyClimateValue[],
  config: Et0CalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'REFERENCE_EVAPOTRANSPIRATION';
  const formulaVersion = formulaVersionForMethod('REFERENCE_EVAPOTRANSPIRATION', config.method);
  const unitId = unitIdForCode('MM');
  const seriesResult = computeDailyEt0Series(dailyMinTemps, dailyMaxTemps, dailyReferenceEt, config);
  return seriesOutcome('REFERENCE_EVAPOTRANSPIRATION', formulaCode, formulaVersion, unitId, config, seriesResult, (known) =>
    known.reduce((s, v) => s + v, 0),
  );
}

export function calculatePotentialEvapotranspiration(
  dailyMinTemps: DailyClimateValue[],
  dailyMaxTemps: DailyClimateValue[],
  dailyReferenceEt: DailyClimateValue[],
  config: Et0CalculationConfig,
): IndicatorCalculationOutcome {
  const formulaCode = 'POTENTIAL_EVAPOTRANSPIRATION';
  const formulaVersion = formulaVersionForMethod('POTENTIAL_EVAPOTRANSPIRATION', config.method);
  const unitId = unitIdForCode('MM_PER_DAY');
  const seriesResult = computeDailyEt0Series(dailyMinTemps, dailyMaxTemps, dailyReferenceEt, config);
  return seriesOutcome('POTENTIAL_EVAPOTRANSPIRATION', formulaCode, formulaVersion, unitId, config, seriesResult, (known) =>
    known.reduce((s, v) => s + v, 0) / known.length,
  );
}

function pairKnownPrecipEt0(
  dailyPrecip: DailyClimateValue[],
  et0Series: DailyClimateValue[],
): Array<{ date: string; precip: number; et0: number }> {
  const et0ByDate = new Map(et0Series.filter((d) => d.value != null).map((d) => [d.date, d.value as number]));
  const pairs: Array<{ date: string; precip: number; et0: number }> = [];
  for (const day of dailyPrecip) {
    if (day.value == null) continue;
    const et0 = et0ByDate.get(day.date);
    if (et0 == null) continue;
    pairs.push({ date: day.date, precip: day.value, et0 });
  }
  return pairs;
}

function waterBalanceOutcome(
  indicatorCode: IndicatorCalculationOutcome['indicatorCode'],
  formulaCode: string,
  formulaVersion: string,
  dailyPrecip: DailyClimateValue[],
  dailyMinTemps: DailyClimateValue[],
  dailyMaxTemps: DailyClimateValue[],
  dailyReferenceEt: DailyClimateValue[],
  config: Et0CalculationConfig,
  reducer: (pairs: Array<{ precip: number; et0: number }>) => number,
): IndicatorCalculationOutcome {
  const unitId = unitIdForCode('MM');
  const seriesResult = computeDailyEt0Series(dailyMinTemps, dailyMaxTemps, dailyReferenceEt, config);
  if (seriesResult.overallStatus === 'not_implemented') {
    return insufficient(
      indicatorCode,
      formulaCode,
      formulaVersion,
      unitId,
      `ET0 series unavailable — ${seriesResult.message ?? 'method not implemented'}`,
    );
  }
  if (seriesResult.overallStatus === 'not_configured') {
    return insufficient(indicatorCode, formulaCode, formulaVersion, unitId, seriesResult.message ?? 'ET0 method not configured');
  }
  const pairs = pairKnownPrecipEt0(dailyPrecip, seriesResult.series);
  const coverage = buildCoverage(pairs.length, config.periodStartDate, config.periodEndDate);
  if (pairs.length === 0) {
    return insufficient(
      indicatorCode,
      formulaCode,
      formulaVersion,
      unitId,
      'No days with both known precipitation and ET0 in the analysis period',
      { method: config.method },
    );
  }
  return {
    indicatorCode,
    calculatedValue: reducer(pairs),
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: { method: config.method, pairedDays: pairs.length },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculateSeasonalWaterBalance(
  dailyPrecip: DailyClimateValue[],
  dailyMinTemps: DailyClimateValue[],
  dailyMaxTemps: DailyClimateValue[],
  dailyReferenceEt: DailyClimateValue[],
  config: Et0CalculationConfig,
): IndicatorCalculationOutcome {
  return waterBalanceOutcome(
    'SEASONAL_WATER_BALANCE',
    'SEASONAL_WATER_BALANCE',
    formulaVersionForMethod('SEASONAL_WATER_BALANCE', config.method),
    dailyPrecip,
    dailyMinTemps,
    dailyMaxTemps,
    dailyReferenceEt,
    config,
    (pairs) => pairs.reduce((s, p) => s + (p.precip - p.et0), 0),
  );
}

export function calculateClimaticWaterDeficit(
  dailyPrecip: DailyClimateValue[],
  dailyMinTemps: DailyClimateValue[],
  dailyMaxTemps: DailyClimateValue[],
  dailyReferenceEt: DailyClimateValue[],
  config: Et0CalculationConfig,
): IndicatorCalculationOutcome {
  return waterBalanceOutcome(
    'CLIMATIC_WATER_DEFICIT',
    'CLIMATIC_WATER_DEFICIT',
    formulaVersionForMethod('CLIMATIC_WATER_DEFICIT', config.method),
    dailyPrecip,
    dailyMinTemps,
    dailyMaxTemps,
    dailyReferenceEt,
    config,
    (pairs) => pairs.reduce((s, p) => s + Math.max(0, p.et0 - p.precip), 0),
  );
}

export function calculateClimaticWaterSurplus(
  dailyPrecip: DailyClimateValue[],
  dailyMinTemps: DailyClimateValue[],
  dailyMaxTemps: DailyClimateValue[],
  dailyReferenceEt: DailyClimateValue[],
  config: Et0CalculationConfig,
): IndicatorCalculationOutcome {
  return waterBalanceOutcome(
    'CLIMATIC_WATER_SURPLUS',
    'CLIMATIC_WATER_SURPLUS',
    formulaVersionForMethod('CLIMATIC_WATER_SURPLUS', config.method),
    dailyPrecip,
    dailyMinTemps,
    dailyMaxTemps,
    dailyReferenceEt,
    config,
    (pairs) => pairs.reduce((s, p) => s + Math.max(0, p.precip - p.et0), 0),
  );
}

export function calculatePrecipitationEt0Ratio(
  dailyPrecip: DailyClimateValue[],
  dailyMinTemps: DailyClimateValue[],
  dailyMaxTemps: DailyClimateValue[],
  dailyReferenceEt: DailyClimateValue[],
  config: Et0CalculationConfig,
): IndicatorCalculationOutcome {
  const indicatorCode = 'PRECIPITATION_ET0_RATIO' as const;
  const formulaCode = 'PRECIPITATION_ET0_RATIO';
  const formulaVersion = formulaVersionForMethod('PRECIPITATION_ET0_RATIO', config.method);
  const unitId = unitIdForCode('NONE');
  const seriesResult = computeDailyEt0Series(dailyMinTemps, dailyMaxTemps, dailyReferenceEt, config);
  if (seriesResult.overallStatus === 'not_implemented') {
    return insufficient(
      indicatorCode,
      formulaCode,
      formulaVersion,
      unitId,
      `ET0 series unavailable — ${seriesResult.message ?? 'method not implemented'}`,
    );
  }
  if (seriesResult.overallStatus === 'not_configured') {
    return insufficient(indicatorCode, formulaCode, formulaVersion, unitId, seriesResult.message ?? 'ET0 method not configured');
  }
  const pairs = pairKnownPrecipEt0(dailyPrecip, seriesResult.series);
  const coverage = buildCoverage(pairs.length, config.periodStartDate, config.periodEndDate);
  if (pairs.length === 0) {
    return insufficient(
      indicatorCode,
      formulaCode,
      formulaVersion,
      unitId,
      'No days with both known precipitation and ET0 in the analysis period',
    );
  }
  const sumPrecip = pairs.reduce((s, p) => s + p.precip, 0);
  const sumEt0 = pairs.reduce((s, p) => s + p.et0, 0);
  if (sumEt0 === 0) {
    return {
      indicatorCode,
      calculatedValue: null,
      valueDate: null,
      unitId,
      formulaCode,
      formulaVersion,
      inputSummary: { sumPrecip, sumEt0 },
      coverage,
      calculationStatus: 'INVALID_INPUT',
      calculationMessage: 'Sum of ET0 over paired days is zero',
    };
  }
  return {
    indicatorCode,
    calculatedValue: sumPrecip / sumEt0,
    valueDate: null,
    unitId,
    formulaCode,
    formulaVersion,
    inputSummary: { sumPrecip, sumEt0, method: config.method },
    coverage,
    calculationStatus: 'CALCULATED',
    calculationMessage: null,
  };
}

export function calculateAllEt0WaterBalanceIndicators(
  dailyPrecip: DailyClimateValue[],
  dailyMinTemps: DailyClimateValue[],
  dailyMaxTemps: DailyClimateValue[],
  dailyReferenceEt: DailyClimateValue[],
  config: Et0CalculationConfig,
): IndicatorCalculationOutcome[] {
  return [
    calculateReferenceEvapotranspiration(dailyMinTemps, dailyMaxTemps, dailyReferenceEt, config),
    calculatePotentialEvapotranspiration(dailyMinTemps, dailyMaxTemps, dailyReferenceEt, config),
    calculateClimaticWaterDeficit(dailyPrecip, dailyMinTemps, dailyMaxTemps, dailyReferenceEt, config),
    calculateClimaticWaterSurplus(dailyPrecip, dailyMinTemps, dailyMaxTemps, dailyReferenceEt, config),
    calculatePrecipitationEt0Ratio(dailyPrecip, dailyMinTemps, dailyMaxTemps, dailyReferenceEt, config),
    calculateSeasonalWaterBalance(dailyPrecip, dailyMinTemps, dailyMaxTemps, dailyReferenceEt, config),
  ];
}
