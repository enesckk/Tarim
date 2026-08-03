import { z } from 'zod';
import type { AgroClimateRepository } from '../repositories/agroclimate.repository.js';
import type {
  AgroClimateAnalysisRun,
  AgroClimateCalculationConfig,
  AgroClimateValidationIssue,
  AgroClimateValidationResult,
  ClimateObservation,
  ClimateDataSource,
} from '../types/agroclimate.types.js';
import {
  PARAMETER_CODES,
  SOURCE_TYPES,
  STATUSES,
  QUALITY_STATUSES,
  CALCULATION_TYPES,
  CATEGORIES,
} from '../types/agroclimate.types.js';

void PARAMETER_CODES;
void SOURCE_TYPES;
void STATUSES;
void QUALITY_STATUSES;
void CALCULATION_TYPES;
void CATEGORIES;

const sourceTypeSchema = z.enum([
  'NASA_POWER',
  'ERA5_LAND',
  'WEATHER_STATION',
  'SATELLITE_DERIVED',
  'MANUAL_IMPORT',
  'OTHER',
]);
const parameterCodeSchema = z.enum([
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
]);

export const createClimateDataSourceSchema = z.object({
  code: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(500),
  provider: z.string().trim().max(200).nullable().optional(),
  sourceType: sourceTypeSchema,
  spatialResolution: z.string().trim().max(200).nullable().optional(),
  temporalResolution: z.string().trim().max(200).nullable().optional(),
  coverageStartDate: z.string().nullable().optional(),
  coverageEndDate: z.string().nullable().optional(),
  apiVersion: z.string().trim().max(100).nullable().optional(),
  datasetVersion: z.string().trim().max(100).nullable().optional(),
  license: z.string().trim().max(500).nullable().optional(),
  priority: z.number().int().nullable().optional(),
  isPrimary: z.boolean().optional(),
});

export const createClimateObservationSchema = z.object({
  parcelId: z.string().trim().min(1).max(200),
  zoneId: z.string().trim().max(200).nullable().optional(),
  dataSourceId: z.string().uuid(),
  observationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observationTime: z.string().trim().max(50).nullable().optional(),
  parameterCode: parameterCodeSchema,
  rawValue: z.number().nullable().optional(),
  rawUnit: z.string().trim().max(50).nullable().optional(),
  normalizedValue: z.number().nullable().optional(),
  normalizedUnitId: z.string().uuid().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  spatialResolution: z.string().trim().max(200).nullable().optional(),
  temporalResolution: z.string().trim().max(200).nullable().optional(),
  qualityFlag: z.string().trim().max(50).nullable().optional(),
  missingReason: z.string().trim().max(500).nullable().optional(),
  sourceRecordId: z.string().trim().max(200).nullable().optional(),
  datasetVersion: z.string().trim().max(100).nullable().optional(),
  retrievedAt: z.string().datetime().nullable().optional(),
});

export const createCalculationConfigSchema = z.object({
  indicatorId: z.string().uuid(),
  regionId: z.string().trim().min(1).max(200),
  cropId: z.string().trim().max(200).nullable().optional(),
  baseTemperature: z.number().nullable().optional(),
  upperTemperatureLimit: z.number().nullable().optional(),
  frostThreshold: z.number().nullable().optional(),
  severeFrostThreshold: z.number().nullable().optional(),
  extremeHeatThreshold: z.number().nullable().optional(),
  heatwaveMinimumDuration: z.number().int().positive().nullable().optional(),
  rainyDayThreshold: z.number().nullable().optional(),
  heavyRainThreshold: z.number().nullable().optional(),
  dryDayThreshold: z.number().nullable().optional(),
  calculationPeriodStart: z.string().nullable().optional(),
  calculationPeriodEnd: z.string().nullable().optional(),
  formulaCode: z.string().trim().max(200).nullable().optional(),
  formulaVersion: z.string().trim().max(200).nullable().optional(),
  source: z.string().trim().max(500).nullable().optional(),
});

export const updateCalculationConfigSchema = createCalculationConfigSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createAnalysisRunSchema = z.object({
  parcelId: z.string().trim().min(1).max(200),
  zoneId: z.string().trim().max(200).nullable().optional(),
  analysisCode: z.string().trim().min(1).max(100),
  analysisPeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  analysisPeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  baselinePeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  baselinePeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  primaryDataSourceId: z.string().uuid(),
  secondaryDataSourceId: z.string().uuid().nullable().optional(),
  requestedBy: z.string().trim().max(500).nullable().optional(),
  formulaSetVersion: z.string().trim().min(1).max(100).optional(),
  minimumCoverageRequirement: z.number().min(0).max(100).nullable().optional(),
});

export const createSourceComparisonSchema = z.object({
  parcelId: z.string().trim().min(1).max(200),
  parameterCode: parameterCodeSchema,
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  primarySourceId: z.string().uuid(),
  secondarySourceId: z.string().uuid(),
});

export type CreateClimateDataSourceInput = z.infer<typeof createClimateDataSourceSchema>;
export type CreateClimateObservationInput = z.infer<typeof createClimateObservationSchema>;
export type CreateCalculationConfigInput = z.infer<typeof createCalculationConfigSchema>;
export type UpdateCalculationConfigInput = z.infer<typeof updateCalculationConfigSchema>;
export type CreateAnalysisRunInput = z.infer<typeof createAnalysisRunSchema>;
export type CreateSourceComparisonInput = z.infer<typeof createSourceComparisonSchema>;

function issue(
  code: string,
  message: string,
  path?: string,
  severity: 'error' | 'warning' = 'error',
): AgroClimateValidationIssue {
  return { code, message, path, severity };
}

export class AgroClimateValidationService {
  constructor(private readonly repo: AgroClimateRepository) {}

  async validateDataSourceUnique(row: ClimateDataSource): Promise<AgroClimateValidationResult> {
    const issues: AgroClimateValidationIssue[] = [];
    const existing = await this.repo.getDataSourceByCode(row.code);
    if (existing && existing.id !== row.id && existing.isActive) {
      issues.push(issue('SOURCE_CODE_DUPLICATE', `Data source code exists: ${row.code}`, 'code'));
    }
    return { valid: issues.length === 0, issues };
  }

  async validateObservation(row: ClimateObservation): Promise<AgroClimateValidationResult> {
    const issues: AgroClimateValidationIssue[] = [];
    // null ≠ 0 — both allowed; raw preserved separately from normalized
    if (row.rawValue == null && row.normalizedValue == null && !row.missingReason) {
      issues.push(
        issue(
          'EMPTY_OBSERVATION',
          'Observation has neither raw nor normalized value and no missingReason',
          'rawValue',
          'warning',
        ),
      );
    }
    const dup = await this.repo.findDuplicateObservation({
      parcelId: row.parcelId,
      dataSourceId: row.dataSourceId,
      observationDate: row.observationDate,
      parameterCode: row.parameterCode,
      excludeId: row.id,
    });
    if (dup) {
      issues.push(
        issue(
          'DUPLICATE_OBSERVATION',
          'Duplicate observation for parcel/source/date/parameter',
          'parameterCode',
        ),
      );
    }
    return { valid: issues.every((i) => i.severity !== 'error'), issues };
  }

  validateAnalysisPeriod(start: string, end: string): AgroClimateValidationResult {
    const issues: AgroClimateValidationIssue[] = [];
    if (start > end) {
      issues.push(issue('INVALID_PERIOD', 'PeriodStart must not be after PeriodEnd', 'analysisPeriodStart'));
    }
    return { valid: issues.length === 0, issues };
  }

  validateConfig(row: AgroClimateCalculationConfig): AgroClimateValidationResult {
    const issues: AgroClimateValidationIssue[] = [];
    if (
      row.calculationPeriodStart &&
      row.calculationPeriodEnd &&
      row.calculationPeriodStart > row.calculationPeriodEnd
    ) {
      issues.push(issue('INVALID_PERIOD', 'Config period start after end', 'calculationPeriodStart'));
    }
    return { valid: issues.every((i) => i.severity !== 'error'), issues };
  }

  validateAnalysisRun(row: AgroClimateAnalysisRun): AgroClimateValidationResult {
    return this.validateAnalysisPeriod(row.analysisPeriodStart, row.analysisPeriodEnd);
  }
}
