import type { VerificationStatus } from '../../types/physical-suitability.types.js';

/**
 * Phase 2.3A — AgroClimate Indicators Engine.
 * Aggregate root: AgroClimateAnalysis (an AgroClimateAnalysisRun plus its indicator
 * results and any source comparisons produced by that run).
 *
 * Scope boundaries (do not violate in this module):
 * - NO suitability scoring, crop-fit classification, or "good/bad for crop X" labels.
 * - NO AI / ML inference or automatic recommendations.
 * - NO crop recommendation or crop coefficient (Kc) based water-use logic.
 * - Unresolved scientific methods (e.g. FAO Penman–Monteith, growing-season
 *   onset/offset detection, meteorological drought indices) are represented as
 *   INSUFFICIENT_DATA / FAILED / REQUIRES_REVIEW outcomes, never guessed.
 * - Consistency/agreement thresholds between climate data sources are never invented;
 *   automated comparisons stay REQUIRES_REVIEW (see ClimateSourceComparison) —
 *   CONSISTENT / MINOR_DIFFERENCE / MAJOR_DIFFERENCE are reserved for a future
 *   config-driven or human classification step.
 */

/* ------------------------------------------------------------------------ */
/* Climate data source                                                       */
/* ------------------------------------------------------------------------ */

export type SourceType =
  | 'NASA_POWER'
  | 'ERA5_LAND'
  | 'WEATHER_STATION'
  | 'SATELLITE_DERIVED'
  | 'MANUAL_IMPORT'
  | 'OTHER';

export const SOURCE_TYPES: readonly SourceType[] = [
  'NASA_POWER',
  'ERA5_LAND',
  'WEATHER_STATION',
  'SATELLITE_DERIVED',
  'MANUAL_IMPORT',
  'OTHER',
] as const;

export type ClimateDataSource = {
  id: string;
  code: string;
  name: string;
  provider: string;
  sourceType: SourceType;
  spatialResolution: string | null;
  temporalResolution: string | null;
  coverageStartDate: string | null;
  coverageEndDate: string | null;
  apiVersion: string | null;
  datasetVersion: string | null;
  license: string | null;
  priority: number | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
};

/* ------------------------------------------------------------------------ */
/* Climate observations                                                      */
/* ------------------------------------------------------------------------ */

export type ParameterCode =
  | 'T2M_MIN'
  | 'T2M_MAX'
  | 'T2M_MEAN'
  | 'SOIL_TEMPERATURE'
  | 'PRECIPITATION'
  | 'RELATIVE_HUMIDITY'
  | 'SOLAR_RADIATION'
  | 'WIND_SPEED'
  | 'WIND_DIRECTION'
  | 'SURFACE_PRESSURE'
  | 'DEW_POINT'
  | 'SOIL_MOISTURE'
  | 'REFERENCE_ET'
  | 'CLOUD_COVER';

export const PARAMETER_CODES: readonly ParameterCode[] = [
  'T2M_MIN',
  'T2M_MAX',
  'T2M_MEAN',
  'SOIL_TEMPERATURE',
  'PRECIPITATION',
  'RELATIVE_HUMIDITY',
  'SOLAR_RADIATION',
  'WIND_SPEED',
  'WIND_DIRECTION',
  'SURFACE_PRESSURE',
  'DEW_POINT',
  'SOIL_MOISTURE',
  'REFERENCE_ET',
  'CLOUD_COVER',
] as const;

/**
 * Shared data-quality flag for both raw observations and the indicator results
 * derived from them (an indicator's flag reflects the least-trusted flag among
 * the observations it consumed). No numeric agreement/consistency threshold is
 * attached to any of these values — they describe provenance, not quality score.
 */
export type ClimateQualityFlag = 'RAW' | 'ESTIMATED' | 'GAP_FILLED' | 'QC_FLAGGED' | 'MISSING';

export const CLIMATE_QUALITY_FLAGS: readonly ClimateQualityFlag[] = [
  'RAW',
  'ESTIMATED',
  'GAP_FILLED',
  'QC_FLAGGED',
  'MISSING',
] as const;

/** One parameter, one day (or one timestamp), one parcel, one data source. */
export type ClimateObservation = {
  id: string;
  parcelId: string;
  zoneId: string | null;
  dataSourceId: string;
  observationDate: string;
  observationTime: string | null;
  parameterCode: ParameterCode;
  /** As received from the source, in `rawUnit`. `null` = missing. */
  rawValue: number | null;
  rawUnit: string | null;
  /** Converted to the canonical unit identified by `normalizedUnitId`. */
  normalizedValue: number | null;
  normalizedUnitId: string | null;
  latitude: number | null;
  longitude: number | null;
  spatialResolution: string | null;
  temporalResolution: string | null;
  qualityFlag: ClimateQualityFlag;
  missingReason: string | null;
  sourceRecordId: string | null;
  datasetVersion: string | null;
  retrievedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

/* ------------------------------------------------------------------------ */
/* Indicator catalog                                                         */
/* ------------------------------------------------------------------------ */

export type Category =
  | 'TEMPERATURE'
  | 'FROST'
  | 'HEAT'
  | 'GROWING_SEASON'
  | 'PRECIPITATION'
  | 'DROUGHT'
  | 'WATER_BALANCE'
  | 'EVAPOTRANSPIRATION'
  | 'RADIATION'
  | 'HUMIDITY'
  | 'WIND'
  | 'DATA_QUALITY';

export const CATEGORIES: readonly Category[] = [
  'TEMPERATURE',
  'FROST',
  'HEAT',
  'GROWING_SEASON',
  'PRECIPITATION',
  'DROUGHT',
  'WATER_BALANCE',
  'EVAPOTRANSPIRATION',
  'RADIATION',
  'HUMIDITY',
  'WIND',
  'DATA_QUALITY',
] as const;

export type CalculationType = 'DIRECT' | 'AGGREGATED' | 'DERIVED' | 'STATISTICAL' | 'EVENT_BASED';

export const CALCULATION_TYPES: readonly CalculationType[] = [
  'DIRECT',
  'AGGREGATED',
  'DERIVED',
  'STATISTICAL',
  'EVENT_BASED',
] as const;

export type TemporalScope = 'DAILY' | 'MONTHLY' | 'SEASONAL' | 'ANNUAL' | 'MULTI_YEAR' | 'CUSTOM_PERIOD';

export const TEMPORAL_SCOPES: readonly TemporalScope[] = [
  'DAILY',
  'MONTHLY',
  'SEASONAL',
  'ANNUAL',
  'MULTI_YEAR',
  'CUSTOM_PERIOD',
] as const;

export type SpatialScope = 'POINT' | 'PARCEL' | 'ZONE' | 'REGION';

export const SPATIAL_SCOPES: readonly SpatialScope[] = ['POINT', 'PARCEL', 'ZONE', 'REGION'] as const;

/**
 * All 58 Phase 2.3A indicator codes.
 * TEMPERATURE(5) FROST(7) HEAT(5) GROWING_SEASON(6) PRECIPITATION(7) DROUGHT(5)
 * WATER_BALANCE/EVAPOTRANSPIRATION(6) RADIATION(4) HUMIDITY(4) WIND(4)
 * DATA_QUALITY(5) = 58.
 */
export type IndicatorCode =
  // TEMPERATURE
  | 'MEAN_TEMPERATURE'
  | 'MINIMUM_TEMPERATURE'
  | 'MAXIMUM_TEMPERATURE'
  | 'TEMPERATURE_RANGE'
  | 'MEAN_GROWING_SEASON_TEMPERATURE'
  // FROST
  | 'FROST_DAY_COUNT'
  | 'SEVERE_FROST_DAY_COUNT'
  | 'LAST_SPRING_FROST_DATE'
  | 'FIRST_AUTUMN_FROST_DATE'
  | 'FROST_FREE_PERIOD_DAYS'
  | 'FROST_EVENT_COUNT'
  | 'LONGEST_FROST_EVENT_DAYS'
  // HEAT
  | 'EXTREME_HEAT_DAY_COUNT'
  | 'HEATWAVE_EVENT_COUNT'
  | 'LONGEST_HEATWAVE_DAYS'
  | 'MAXIMUM_HEATWAVE_TEMPERATURE'
  | 'HIGH_NIGHT_TEMPERATURE_COUNT'
  // GROWING_SEASON
  | 'GDD'
  | 'GDD_BASE_TEMPERATURE'
  | 'GROWING_SEASON_START_DATE'
  | 'GROWING_SEASON_END_DATE'
  | 'GROWING_SEASON_LENGTH'
  | 'ACTIVE_GROWING_DAY_COUNT'
  // PRECIPITATION
  | 'TOTAL_PRECIPITATION'
  | 'SEASONAL_PRECIPITATION'
  | 'RAINY_DAY_COUNT'
  | 'HEAVY_RAIN_DAY_COUNT'
  | 'MAXIMUM_DAILY_PRECIPITATION'
  | 'PRECIPITATION_VARIABILITY'
  | 'PRECIPITATION_CONCENTRATION'
  // DROUGHT
  | 'CONSECUTIVE_DRY_DAYS'
  | 'LONGEST_DRY_SPELL'
  | 'DRY_SPELL_EVENT_COUNT'
  | 'PRECIPITATION_DEFICIT'
  | 'METEOROLOGICAL_DROUGHT_INDEX'
  // WATER_BALANCE / EVAPOTRANSPIRATION
  | 'REFERENCE_EVAPOTRANSPIRATION'
  | 'POTENTIAL_EVAPOTRANSPIRATION'
  | 'CLIMATIC_WATER_DEFICIT'
  | 'CLIMATIC_WATER_SURPLUS'
  | 'PRECIPITATION_ET0_RATIO'
  | 'SEASONAL_WATER_BALANCE'
  // RADIATION
  | 'TOTAL_SOLAR_RADIATION'
  | 'MEAN_DAILY_SOLAR_RADIATION'
  | 'SUNSHINE_DURATION'
  | 'LOW_RADIATION_DAY_COUNT'
  // HUMIDITY
  | 'MEAN_RELATIVE_HUMIDITY'
  | 'LOW_HUMIDITY_DAY_COUNT'
  | 'HIGH_HUMIDITY_DAY_COUNT'
  | 'VAPOR_PRESSURE_DEFICIT'
  // WIND
  | 'MEAN_WIND_SPEED'
  | 'MAXIMUM_WIND_SPEED'
  | 'HIGH_WIND_DAY_COUNT'
  | 'PREVAILING_WIND_DIRECTION'
  // DATA_QUALITY
  | 'DATA_COVERAGE_PERCENT'
  | 'MISSING_DAY_COUNT'
  | 'SOURCE_CONSISTENCY_SCORE'
  | 'OUTLIER_COUNT'
  | 'QUALITY_SCORE';

export const INDICATOR_CODES: readonly IndicatorCode[] = [
  'MEAN_TEMPERATURE',
  'MINIMUM_TEMPERATURE',
  'MAXIMUM_TEMPERATURE',
  'TEMPERATURE_RANGE',
  'MEAN_GROWING_SEASON_TEMPERATURE',
  'FROST_DAY_COUNT',
  'SEVERE_FROST_DAY_COUNT',
  'LAST_SPRING_FROST_DATE',
  'FIRST_AUTUMN_FROST_DATE',
  'FROST_FREE_PERIOD_DAYS',
  'FROST_EVENT_COUNT',
  'LONGEST_FROST_EVENT_DAYS',
  'EXTREME_HEAT_DAY_COUNT',
  'HEATWAVE_EVENT_COUNT',
  'LONGEST_HEATWAVE_DAYS',
  'MAXIMUM_HEATWAVE_TEMPERATURE',
  'HIGH_NIGHT_TEMPERATURE_COUNT',
  'GDD',
  'GDD_BASE_TEMPERATURE',
  'GROWING_SEASON_START_DATE',
  'GROWING_SEASON_END_DATE',
  'GROWING_SEASON_LENGTH',
  'ACTIVE_GROWING_DAY_COUNT',
  'TOTAL_PRECIPITATION',
  'SEASONAL_PRECIPITATION',
  'RAINY_DAY_COUNT',
  'HEAVY_RAIN_DAY_COUNT',
  'MAXIMUM_DAILY_PRECIPITATION',
  'PRECIPITATION_VARIABILITY',
  'PRECIPITATION_CONCENTRATION',
  'CONSECUTIVE_DRY_DAYS',
  'LONGEST_DRY_SPELL',
  'DRY_SPELL_EVENT_COUNT',
  'PRECIPITATION_DEFICIT',
  'METEOROLOGICAL_DROUGHT_INDEX',
  'REFERENCE_EVAPOTRANSPIRATION',
  'POTENTIAL_EVAPOTRANSPIRATION',
  'CLIMATIC_WATER_DEFICIT',
  'CLIMATIC_WATER_SURPLUS',
  'PRECIPITATION_ET0_RATIO',
  'SEASONAL_WATER_BALANCE',
  'TOTAL_SOLAR_RADIATION',
  'MEAN_DAILY_SOLAR_RADIATION',
  'SUNSHINE_DURATION',
  'LOW_RADIATION_DAY_COUNT',
  'MEAN_RELATIVE_HUMIDITY',
  'LOW_HUMIDITY_DAY_COUNT',
  'HIGH_HUMIDITY_DAY_COUNT',
  'VAPOR_PRESSURE_DEFICIT',
  'MEAN_WIND_SPEED',
  'MAXIMUM_WIND_SPEED',
  'HIGH_WIND_DAY_COUNT',
  'PREVAILING_WIND_DIRECTION',
  'DATA_COVERAGE_PERCENT',
  'MISSING_DAY_COUNT',
  'SOURCE_CONSISTENCY_SCORE',
  'OUTLIER_COUNT',
  'QUALITY_SCORE',
] as const;

/** Catalog definition of an indicator (no calculated values live here). */
export type AgroClimateIndicator = {
  id: string;
  code: IndicatorCode;
  canonicalName: string;
  turkishDisplayName: string;
  englishDisplayName: string;
  category: Category;
  description: string | null;
  canonicalUnitId: string | null;
  calculationType: CalculationType;
  temporalScope: TemporalScope;
  spatialScope: SpatialScope;
  requiresDailyData: boolean;
  requiresHourlyData: boolean;
  /** Never invented — null until an expert-defined minimum coverage rule exists. */
  minimumDataCoveragePercent: number | null;
  formulaVersion: string;
  /** Never invented — false until a physical-suitability criterion formally depends on it. */
  isRequiredForPhysicalSuitability: boolean;
  displayOrder: number;
  source: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

/* ------------------------------------------------------------------------ */
/* Calculation configuration                                                 */
/* ------------------------------------------------------------------------ */

/**
 * Reference evapotranspiration method. Used by the ET0/water-balance calculation
 * engine (not a persisted `AgroClimateCalculationConfig` field) — see
 * `services/calculations/et0-water-balance.calculation.ts`.
 */
export type ET0CalculationMethod =
  | 'SOURCE_PROVIDED'
  | 'FAO_PENMAN_MONTEITH'
  | 'HARGREAVES_SAMANI'
  | 'NOT_CONFIGURED';

export const ET0_CALCULATION_METHODS: readonly ET0CalculationMethod[] = [
  'SOURCE_PROVIDED',
  'FAO_PENMAN_MONTEITH',
  'HARGREAVES_SAMANI',
  'NOT_CONFIGURED',
] as const;

/**
 * Growing degree day method. Only SIMPLE_AVERAGE is implemented in Phase 2.3A;
 * the sine-curve methods are reserved for a future phase and always report
 * `INSUFFICIENT_DATA` from the calculation engine (never guessed).
 */
export type GddMethod = 'SIMPLE_AVERAGE' | 'SINGLE_SINE' | 'DOUBLE_SINE';

export const GDD_METHODS: readonly GddMethod[] = ['SIMPLE_AVERAGE', 'SINGLE_SINE', 'DOUBLE_SINE'] as const;

/**
 * Per-(indicator, region, [crop]) calculation thresholds. Unknown values MUST
 * stay null — never guessed. `cropId` is the only optional/nullable identifier;
 * a null `cropId` means the config applies to the region regardless of crop.
 */
export type AgroClimateCalculationConfig = {
  id: string;
  indicatorId: string;
  regionId: string;
  cropId: string | null;
  /** °C — required for GDD. */
  baseTemperature: number | null;
  /** °C — optional cap applied to Tmax in the GDD formula. */
  upperTemperatureLimit: number | null;
  /** °C — T2M_MIN <= threshold counts as a frost day. */
  frostThreshold: number | null;
  /** °C — stricter subset of frost days. */
  severeFrostThreshold: number | null;
  /** °C — T2M_MAX >= threshold counts as an extreme heat day. */
  extremeHeatThreshold: number | null;
  /** Minimum consecutive extreme-heat days to qualify as a heatwave event. */
  heatwaveMinimumDuration: number | null;
  /** mm — daily precipitation >= threshold counts as a rainy day. */
  rainyDayThreshold: number | null;
  /** mm — daily precipitation >= threshold counts as heavy rain. */
  heavyRainThreshold: number | null;
  /** mm — daily precipitation < threshold counts as a dry day. */
  dryDayThreshold: number | null;
  calculationPeriodStart: string | null;
  calculationPeriodEnd: string | null;
  formulaCode: string | null;
  formulaVersion: string | null;
  source: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

/* ------------------------------------------------------------------------ */
/* Analysis run                                                              */
/* ------------------------------------------------------------------------ */

export type Status =
  | 'CREATED'
  | 'VALIDATING'
  | 'FETCHING_DATA'
  | 'NORMALIZING'
  | 'CALCULATING'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'FAILED'
  | 'REQUIRES_REVIEW';

export const STATUSES: readonly Status[] = [
  'CREATED',
  'VALIDATING',
  'FETCHING_DATA',
  'NORMALIZING',
  'CALCULATING',
  'COMPLETED',
  'PARTIALLY_COMPLETED',
  'FAILED',
  'REQUIRES_REVIEW',
] as const;

export type QualityStatus = 'VALID' | 'LIMITED' | 'INSUFFICIENT' | 'CONFLICTING_SOURCES' | 'REQUIRES_REVIEW';

export const QUALITY_STATUSES: readonly QualityStatus[] = [
  'VALID',
  'LIMITED',
  'INSUFFICIENT',
  'CONFLICTING_SOURCES',
  'REQUIRES_REVIEW',
] as const;

export type AgroClimateAnalysisRun = {
  id: string;
  parcelId: string;
  zoneId: string | null;
  analysisCode: string;
  analysisPeriodStart: string;
  analysisPeriodEnd: string;
  /** Reference period for anomaly/deficit-style indicators (e.g. PRECIPITATION_DEFICIT). */
  baselinePeriodStart: string | null;
  baselinePeriodEnd: string | null;
  primaryDataSourceId: string;
  secondaryDataSourceId: string | null;
  status: Status;
  startedAt: string | null;
  completedAt: string | null;
  requestedBy: string | null;
  formulaSetVersion: string;
  /** Never invented — null until an expert-defined minimum coverage rule exists. */
  minimumCoverageRequirement: number | null;
  actualCoveragePercent: number | null;
  qualityStatus: QualityStatus | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

/* ------------------------------------------------------------------------ */
/* Indicator results                                                         */
/* ------------------------------------------------------------------------ */

export type CalculationStatus =
  | 'CALCULATED'
  | 'INSUFFICIENT_DATA'
  | 'INVALID_INPUT'
  | 'SOURCE_CONFLICT'
  | 'REQUIRES_REVIEW'
  | 'FAILED';

export const CALCULATION_STATUSES: readonly CalculationStatus[] = [
  'CALCULATED',
  'INSUFFICIENT_DATA',
  'INVALID_INPUT',
  'SOURCE_CONFLICT',
  'REQUIRES_REVIEW',
  'FAILED',
] as const;

/** Coarse data-completeness signal — never used as a suitability/quality score. */
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export const CONFIDENCE_LEVELS: readonly ConfidenceLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] as const;

/**
 * Versioned, persisted result of one indicator for one analysis run.
 * Versioned per (analysisRunId, indicatorId): recalculating an already-run
 * indicator MUST create a new version row rather than delete/overwrite the
 * previous one (see repositories/agroclimate.repository.ts).
 */
export type AgroClimateIndicatorResult = {
  id: string;
  analysisRunId: string;
  indicatorId: string;
  parcelId: string;
  zoneId: string | null;
  periodStart: string;
  periodEnd: string;
  calculatedValue: number | null;
  unitId: string | null;
  calculationStatus: CalculationStatus;
  formulaCode: string | null;
  formulaVersion: string;
  configurationId: string | null;
  inputDataCount: number | null;
  expectedDataCount: number | null;
  dataCoveragePercent: number | null;
  primarySourceId: string | null;
  secondarySourceId: string | null;
  sourceDifferencePercent: number | null;
  confidenceLevel: ConfidenceLevel;
  qualityFlag: ClimateQualityFlag | null;
  calculationMessage: string | null;
  inputSummaryJson: string;
  calculatedAt: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

/* ------------------------------------------------------------------------ */
/* Source comparison                                                         */
/* ------------------------------------------------------------------------ */

/**
 * CONSISTENT / MINOR_DIFFERENCE / MAJOR_DIFFERENCE are part of the schema but
 * are never assigned automatically in Phase 2.3A — no agreement/consistency
 * threshold has been scientifically defined. The calculation engine only ever
 * produces INSUFFICIENT_DATA (no overlapping data) or REQUIRES_REVIEW (raw
 * statistics computed, classification left to a human/future config).
 */
export type ComparisonStatus =
  | 'CONSISTENT'
  | 'MINOR_DIFFERENCE'
  | 'MAJOR_DIFFERENCE'
  | 'INSUFFICIENT_DATA'
  | 'REQUIRES_REVIEW';

export const COMPARISON_STATUSES: readonly ComparisonStatus[] = [
  'CONSISTENT',
  'MINOR_DIFFERENCE',
  'MAJOR_DIFFERENCE',
  'INSUFFICIENT_DATA',
  'REQUIRES_REVIEW',
] as const;

export type ClimateSourceComparison = {
  id: string;
  parcelId: string;
  parameterCode: ParameterCode;
  periodStart: string;
  periodEnd: string;
  primarySourceId: string;
  secondarySourceId: string;
  primaryRecordCount: number;
  secondaryRecordCount: number;
  meanAbsoluteDifference: number | null;
  percentageDifference: number | null;
  correlationValue: number | null;
  comparisonStatus: ComparisonStatus;
  notes: string | null;
  createdAt: string;
  version: number;
};

/* ------------------------------------------------------------------------ */
/* Aggregate                                                                  */
/* ------------------------------------------------------------------------ */

export type AgroClimateAnalysis = {
  run: AgroClimateAnalysisRun;
  results: AgroClimateIndicatorResult[];
  comparisons: ClimateSourceComparison[];
};

export type AgroClimateIndicatorCatalog = {
  indicators: AgroClimateIndicator[];
};

/* ------------------------------------------------------------------------ */
/* Calculation-engine shared shapes (not persisted directly)                 */
/* ------------------------------------------------------------------------ */

/** One parameter, one day. `value === null` means missing — never treated as 0. */
export type DailyClimateValue = {
  date: string;
  value: number | null;
};

export type AgroClimateCoverageSummary = {
  knownDays: number;
  expectedDays: number;
  missingDays: number;
  /** null when expectedDays is 0 (degenerate period). */
  coverageRatio: number | null;
};

/** Common return shape for every pure calculation function in this module. */
export type IndicatorCalculationOutcome = {
  indicatorCode: IndicatorCode;
  calculatedValue: number | null;
  valueDate: string | null;
  unitId: string | null;
  /** Method/algorithm identifier used, independent of `formulaVersion`. */
  formulaCode: string;
  formulaVersion: string;
  inputSummary: Record<string, unknown>;
  coverage: AgroClimateCoverageSummary | null;
  calculationStatus: CalculationStatus;
  calculationMessage: string | null;
};

/* ------------------------------------------------------------------------ */
/* Validation                                                                 */
/* ------------------------------------------------------------------------ */

export type AgroClimateValidationIssue = {
  code: string;
  message: string;
  path?: string;
  severity: 'error' | 'warning';
};

export type AgroClimateValidationResult = {
  valid: boolean;
  issues: AgroClimateValidationIssue[];
};
