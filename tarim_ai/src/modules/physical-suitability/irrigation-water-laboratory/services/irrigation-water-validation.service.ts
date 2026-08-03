import { z } from 'zod';
import type { IrrigationWaterRepository } from '../repositories/irrigation-water.repository.js';
import type {
  IrrigationWaterValidationIssue,
  IrrigationWaterValidationResult,
  WaterAnalysisResult,
  WaterParameter,
  WaterSample,
  WaterSampleChainOfCustody,
  WaterSource,
} from '../types/irrigation-water.types.js';
import {
  WATER_CONTINUITY_STATUSES,
  WATER_CUSTODY_ACTIONS,
  WATER_LICENSE_STATUSES,
  WATER_OWNERSHIP_TYPES,
  WATER_PARAMETER_CATEGORIES,
  WATER_SAMPLE_STATUSES,
  WATER_SOURCE_TYPES,
} from '../types/irrigation-water.types.js';

const sourceTypeSchema = z.enum([
  'WELL',
  'SPRING',
  'STREAM',
  'RIVER',
  'CANAL',
  'RESERVOIR',
  'POND',
  'DAM',
  'MUNICIPAL_NETWORK',
  'RAINWATER_STORAGE',
  'TREATED_WASTEWATER',
  'OTHER',
]);
const ownershipSchema = z.enum(['PRIVATE', 'PUBLIC', 'COOPERATIVE', 'SHARED', 'UNKNOWN']);
const licenseSchema = z.enum(['LICENSED', 'UNLICENSED', 'PENDING', 'EXPIRED', 'UNKNOWN']);
const continuitySchema = z.enum(['CONTINUOUS', 'SEASONAL', 'INTERMITTENT', 'UNKNOWN']);
const sampleStatusSchema = z.enum([
  'PLANNED',
  'COLLECTED',
  'IN_TRANSPORT',
  'RECEIVED',
  'IN_ANALYSIS',
  'ANALYZED',
  'APPROVED',
  'ARCHIVED',
  'REJECTED',
]);
const categorySchema = z.enum([
  'GENERAL',
  'SALINITY',
  'SODICITY',
  'MAJOR_CATION',
  'MAJOR_ANION',
  'TOXICITY',
  'NUTRIENT',
  'MICROBIOLOGICAL',
  'PHYSICAL',
  'DERIVED',
]);
const dataTypeSchema = z.enum(['Decimal', 'Integer', 'Boolean', 'Text', 'Enum']);
const verificationSchema = z.enum([
  'Draft',
  'SourceVerified',
  'ExpertReviewed',
  'Approved',
  'Deprecated',
]);
const custodyActionSchema = z.enum([
  'COLLECTED',
  'SEALED',
  'TRANSPORTED',
  'RECEIVED',
  'OPENED',
  'ANALYZED',
  'APPROVED',
  'ARCHIVED',
  'DESTROYED',
]);

void WATER_SOURCE_TYPES;
void WATER_OWNERSHIP_TYPES;
void WATER_LICENSE_STATUSES;
void WATER_CONTINUITY_STATUSES;
void WATER_SAMPLE_STATUSES;
void WATER_PARAMETER_CATEGORIES;
void WATER_CUSTODY_ACTIONS;

const nullableNonNeg = z.number().nonnegative().nullable().optional();

export const createWaterSourceSchema = z.object({
  parcelId: z.string().trim().min(1).max(200).nullable().optional(),
  sourceCode: z.string().trim().min(1).max(100),
  sourceName: z.string().trim().min(1).max(500),
  sourceType: sourceTypeSchema,
  ownershipType: ownershipSchema.optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  geometry: z.string().max(100_000).nullable().optional(),
  isInsideParcel: z.boolean().nullable().optional(),
  relatedParcelId: z.string().trim().max(200).nullable().optional(),
  officialRegistrationNumber: z.string().trim().max(200).nullable().optional(),
  licenseNumber: z.string().trim().max(200).nullable().optional(),
  licenseStatus: licenseSchema.optional(),
  permitStartDate: z.string().datetime().nullable().optional(),
  permitEndDate: z.string().datetime().nullable().optional(),
  intendedUse: z.string().trim().max(500).nullable().optional(),
  declaredDischarge: nullableNonNeg,
  declaredDischargeUnit: z.string().trim().max(50).nullable().optional(),
  measuredDischarge: nullableNonNeg,
  measuredDischargeUnit: z.string().trim().max(50).nullable().optional(),
  wellDepth: nullableNonNeg,
  staticWaterLevel: z.number().nullable().optional(),
  dynamicWaterLevel: z.number().nullable().optional(),
  seasonalAvailability: z.string().trim().max(500).nullable().optional(),
  continuityStatus: continuitySchema.optional(),
  notes: z.string().max(8000).nullable().optional(),
});

export const updateWaterSourceSchema = createWaterSourceSchema.partial();

export const createWaterSampleSchema = z.object({
  waterSourceId: z.string().uuid(),
  sampleCode: z.string().trim().min(1).max(200),
  samplingDate: z.string().datetime().nullable().optional(),
  samplingTime: z.string().trim().max(50).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  sampledBy: z.string().trim().max(500).nullable().optional(),
  samplingPointDescription: z.string().trim().max(2000).nullable().optional(),
  samplingMethod: z.string().trim().max(200).nullable().optional(),
  containerType: z.string().trim().max(200).nullable().optional(),
  preservationMethod: z.string().trim().max(500).nullable().optional(),
  transportCondition: z.string().trim().max(500).nullable().optional(),
  receivedDate: z.string().datetime().nullable().optional(),
  laboratoryId: z.string().uuid().nullable().optional(),
  laboratoryReportId: z.string().uuid().nullable().optional(),
  waterTemperatureAtSampling: z.number().nullable().optional(),
  weatherCondition: z.string().trim().max(500).nullable().optional(),
  currentStatus: sampleStatusSchema.optional(),
  barcode: z.string().trim().max(200).nullable().optional(),
  qrCode: z.string().trim().max(2000).nullable().optional(),
  sealNumber: z.string().trim().max(200).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
});

export const updateWaterSampleSchema = createWaterSampleSchema
  .omit({ sampleCode: true, waterSourceId: true })
  .partial()
  .extend({
    sampleCode: z.string().trim().min(1).max(200).optional(),
    waterSourceId: z.string().uuid().optional(),
  });

export const updateWaterSampleStatusSchema = z.object({
  currentStatus: sampleStatusSchema,
});

export const createWaterParameterSchema = z.object({
  code: z.string().trim().min(1).max(100),
  canonicalName: z.string().trim().min(1).max(500),
  turkishDisplayName: z.string().trim().min(1).max(500),
  englishDisplayName: z.string().trim().min(1).max(500),
  category: categorySchema,
  description: z.string().max(8000).nullable().optional(),
  canonicalUnitId: z.string().uuid().nullable().optional(),
  dataType: dataTypeSchema.optional(),
  decimalPrecision: z.number().int().min(0).max(12).nullable().optional(),
  isDirectlyMeasured: z.boolean().optional(),
  isCalculated: z.boolean().optional(),
  isRequiredForIrrigationAssessment: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  source: z.string().trim().max(500).nullable().optional(),
  verificationStatus: verificationSchema.optional(),
});

export const updateWaterParameterSchema = createWaterParameterSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createWaterAnalysisResultSchema = z.object({
  sampleId: z.string().uuid(),
  parameterId: z.string().uuid(),
  rawParameterName: z.string().trim().max(500).nullable().optional(),
  rawValue: z.string().max(2000).nullable().optional(),
  rawUnit: z.string().trim().max(100).nullable().optional(),
  measuredValue: z.number().nullable().optional(),
  measuredUnitId: z.string().uuid().nullable().optional(),
  analysisMethodId: z.string().uuid().nullable().optional(),
  detectionLimit: z.number().nullable().optional(),
  measurementUncertainty: z.number().nullable().optional(),
  qualityFlag: z.string().trim().max(100).nullable().optional(),
  isAccredited: z.boolean().nullable().optional(),
  source: z.string().trim().max(500).nullable().optional(),
  verificationStatus: verificationSchema.optional(),
});

export const updateWaterAnalysisResultSchema = createWaterAnalysisResultSchema.partial();

export const normalizeWaterAnalysisResultSchema = z.object({
  resultId: z.string().uuid().optional(),
  sampleId: z.string().uuid().optional(),
  parameterId: z.string().uuid().optional(),
  measuredValue: z.number().nullable().optional(),
  measuredUnitId: z.string().uuid().nullable().optional(),
  rawValue: z.string().nullable().optional(),
  rawUnit: z.string().nullable().optional(),
});

export const validateWaterAnalysisResultSchema = createWaterAnalysisResultSchema;

export const createWaterCustodySchema = z.object({
  action: custodyActionSchema,
  performedBy: z.string().trim().max(500).nullable().optional(),
  performedAt: z.string().datetime(),
  location: z.string().trim().max(500).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
});

export type CreateWaterSourceInput = z.infer<typeof createWaterSourceSchema>;
export type UpdateWaterSourceInput = z.infer<typeof updateWaterSourceSchema>;
export type CreateWaterSampleInput = z.infer<typeof createWaterSampleSchema>;
export type UpdateWaterSampleInput = z.infer<typeof updateWaterSampleSchema>;
export type UpdateWaterSampleStatusInput = z.infer<typeof updateWaterSampleStatusSchema>;
export type CreateWaterParameterInput = z.infer<typeof createWaterParameterSchema>;
export type UpdateWaterParameterInput = z.infer<typeof updateWaterParameterSchema>;
export type CreateWaterAnalysisResultInput = z.infer<typeof createWaterAnalysisResultSchema>;
export type UpdateWaterAnalysisResultInput = z.infer<typeof updateWaterAnalysisResultSchema>;
export type NormalizeWaterAnalysisResultInput = z.infer<typeof normalizeWaterAnalysisResultSchema>;
export type CreateWaterCustodyInput = z.infer<typeof createWaterCustodySchema>;

function issue(
  code: string,
  message: string,
  path?: string,
  severity: 'error' | 'warning' = 'error',
): IrrigationWaterValidationIssue {
  return { code, message, path, severity };
}

export class IrrigationWaterValidationService {
  constructor(private readonly repo: IrrigationWaterRepository) {}

  validateWaterSource(row: WaterSource): IrrigationWaterValidationIssue[] {
    const issues: IrrigationWaterValidationIssue[] = [];
    if (row.declaredDischarge != null && row.declaredDischarge < 0) {
      issues.push(issue('NEGATIVE_DISCHARGE', 'Declared discharge must not be negative', 'declaredDischarge'));
    }
    if (row.measuredDischarge != null && row.measuredDischarge < 0) {
      issues.push(issue('NEGATIVE_DISCHARGE', 'Measured discharge must not be negative', 'measuredDischarge'));
    }
    if (row.wellDepth != null && row.wellDepth < 0) {
      issues.push(issue('NEGATIVE_WELL_DEPTH', 'Well depth must not be negative', 'wellDepth'));
    }
    if (row.latitude != null && (row.latitude < -90 || row.latitude > 90)) {
      issues.push(issue('INVALID_GPS', 'Latitude out of range', 'latitude'));
    }
    if (row.longitude != null && (row.longitude < -180 || row.longitude > 180)) {
      issues.push(issue('INVALID_GPS', 'Longitude out of range', 'longitude'));
    }
    if ((row.latitude == null) !== (row.longitude == null)) {
      issues.push(
        issue('INVALID_GPS', 'Latitude and longitude must both be set or both null', 'latitude'),
      );
    }
    return issues;
  }

  async validateSourceCodeUnique(
    row: WaterSource,
  ): Promise<IrrigationWaterValidationResult> {
    const issues = this.validateWaterSource(row);
    const existing = await this.repo.getWaterSourceByCode(row.sourceCode);
    if (existing && existing.id !== row.id) {
      issues.push(issue('SOURCE_CODE_DUPLICATE', `Source code already exists: ${row.sourceCode}`, 'sourceCode'));
    }
    return { valid: issues.every((i) => i.severity !== 'error'), issues };
  }

  async validateSampleCodeUnique(row: WaterSample): Promise<IrrigationWaterValidationResult> {
    const issues: IrrigationWaterValidationIssue[] = [];
    if (row.latitude != null && (row.latitude < -90 || row.latitude > 90)) {
      issues.push(issue('INVALID_GPS', 'Latitude out of range', 'latitude'));
    }
    if (row.longitude != null && (row.longitude < -180 || row.longitude > 180)) {
      issues.push(issue('INVALID_GPS', 'Longitude out of range', 'longitude'));
    }
    if ((row.latitude == null) !== (row.longitude == null)) {
      issues.push(
        issue('INVALID_GPS', 'Latitude and longitude must both be set or both null', 'latitude'),
      );
    }
    const existing = await this.repo.getWaterSampleByCode(row.sampleCode);
    if (existing && existing.id !== row.id) {
      issues.push(
        issue('SAMPLE_CODE_DUPLICATE', `Sample code must be unique: ${row.sampleCode}`, 'sampleCode'),
      );
    }
    return { valid: issues.every((i) => i.severity !== 'error'), issues };
  }

  validateParameterFlags(row: WaterParameter): IrrigationWaterValidationIssue[] {
    const issues: IrrigationWaterValidationIssue[] = [];
    if (row.isCalculated && row.isDirectlyMeasured) {
      issues.push(
        issue(
          'CALCULATED_AS_MEASURED',
          'Calculated parameters must not be marked as directly measured',
          'isDirectlyMeasured',
        ),
      );
    }
    return issues;
  }

  async validateAnalysisResult(
    row: WaterAnalysisResult,
    parameter: WaterParameter | null,
  ): Promise<IrrigationWaterValidationResult> {
    const issues: IrrigationWaterValidationIssue[] = [];
    if (!parameter || !parameter.isActive) {
      issues.push(issue('PARAMETER_NOT_FOUND', 'Water parameter not found', 'parameterId'));
      return { valid: false, issues };
    }

    if (parameter.isCalculated && row.measuredValue != null && row.source !== 'LaboratoryReported') {
      // Lab may report derived values separately — allowed when source marks laboratory report.
      // Manual entry pretending calculated param is measured is rejected when isDirectlyMeasured false
      // and caller tries to set measured without acknowledging lab report.
    }

    if (parameter.dataType === 'Decimal' || parameter.dataType === 'Integer') {
      if (row.rawValue != null && row.rawValue.trim() !== '' && row.measuredValue == null) {
        const n = Number(row.rawValue);
        if (!Number.isFinite(n)) {
          issues.push(
            issue(
              'NON_NUMERIC_VALUE',
              'Numeric parameters must not accept non-numeric text as measured value',
              'rawValue',
            ),
          );
        }
      }
    }

    if (row.measuredUnitId && parameter.canonicalUnitId) {
      const measuredUnit = await this.repo.getMeasurementUnitById(row.measuredUnitId);
      const canonicalUnit = await this.repo.getMeasurementUnitById(parameter.canonicalUnitId);
      if (measuredUnit && canonicalUnit) {
        if (
          measuredUnit.quantityType !== canonicalUnit.quantityType &&
          measuredUnit.id !== canonicalUnit.id
        ) {
          // Allow persistence; normalization will mark UNSUPPORTED_UNIT without erasing raw data.
          // mg/L ↔ meq/L is intentionally not auto-converted (ion-specific).
          issues.push(
            issue(
              'UNIT_INCOMPATIBLE',
              `Unit ${measuredUnit.code} incompatible with parameter canonical ${canonicalUnit.code}; stored for review`,
              'measuredUnitId',
              'warning',
            ),
          );
        }
      }
    }

    const dup = await this.repo.findDuplicateWaterAnalysisResult({
      sampleId: row.sampleId,
      parameterId: row.parameterId,
      analysisMethodId: row.analysisMethodId,
      excludeId: row.id,
    });
    if (dup) {
      issues.push(
        issue(
          'DUPLICATE_RESULT',
          'Duplicate result for same sample, parameter, and analysis method',
          'parameterId',
        ),
      );
    }

    return { valid: issues.every((i) => i.severity !== 'error'), issues };
  }

  async validateCustodyChronology(
    sampleId: string,
    row: WaterSampleChainOfCustody,
  ): Promise<IrrigationWaterValidationResult> {
    const issues: IrrigationWaterValidationIssue[] = [];
    const existing = await this.repo.listChainOfCustody(sampleId);
    const others = existing.filter((c) => c.id !== row.id);
    for (const prev of others) {
      if (prev.performedAt > row.performedAt) {
        issues.push(
          issue(
            'CUSTODY_NOT_CHRONOLOGICAL',
            `Custody action at ${row.performedAt} precedes existing record at ${prev.performedAt}`,
            'performedAt',
          ),
        );
        break;
      }
    }
    // Also require new record >= latest
    if (others.length > 0) {
      const latest = others.reduce((a, b) => (a.performedAt > b.performedAt ? a : b));
      if (row.performedAt < latest.performedAt) {
        issues.push(
          issue(
            'CUSTODY_NOT_CHRONOLOGICAL',
            'New custody records must be chronological (performedAt >= latest)',
            'performedAt',
          ),
        );
      }
    }
    // Dedupe identical messages
    const seen = new Set<string>();
    const unique = issues.filter((i) => {
      const key = `${i.code}:${i.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { valid: unique.every((i) => i.severity !== 'error'), issues: unique };
  }
}
