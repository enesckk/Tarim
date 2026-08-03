import { z } from 'zod';
import type { SoilLaboratoryRepository } from '../repositories/soil-laboratory.repository.js';
import {
  SOIL_QUALITY_FLAGS,
  type AnalysisMethod,
  type Laboratory,
  type SoilAnalysisResult,
  type SoilLaboratoryValidationIssue,
  type SoilLaboratoryValidationResult,
  type SoilQualityFlag,
  type SoilSample,
} from '../types/soil-laboratory.types.js';
import {
  NORMALIZATION_STATUSES,
  SOIL_VALUE_SOURCE_TYPES,
} from '../types/soil-parameter.types.js';
import type { SoilParameterCatalogService } from './soil-parameter-catalog.service.js';

export const soilQualityFlagSchema = z.enum([
  'Unknown',
  'Accepted',
  'Suspect',
  'Rejected',
  'BelowDetectionLimit',
  'AboveRange',
]) satisfies z.ZodType<SoilQualityFlag>;

const verificationStatusSchema = z.enum([
  'Draft',
  'SourceVerified',
  'ExpertReviewed',
  'Approved',
  'Deprecated',
]);

const nullableString = z.string().max(2000).nullable().optional();
const nullableNumber = z.number().nullable().optional();

export const createLaboratorySchema = z.object({
  name: z.string().min(1).max(500),
  country: nullableString,
  city: nullableString,
  accreditationNumber: z.string().max(128).nullable().optional(),
  accreditationStandard: z.string().max(256).nullable().optional(),
  contact: z.string().max(500).nullable().optional(),
  website: z.string().url().max(2000).nullable().optional(),
});

export const updateLaboratorySchema = createLaboratorySchema.partial().extend({
  name: z.string().min(1).max(500).optional(),
  isActive: z.boolean().optional(),
});

export const createAnalysisMethodSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(500),
  description: z.string().max(8000).nullable().optional(),
  standard: z.string().max(256).nullable().optional(),
  organization: z.string().max(256).nullable().optional(),
  methodVersion: z.string().max(64).nullable().optional(),
});

export const updateAnalysisMethodSchema = createAnalysisMethodSchema.partial().extend({
  code: z.string().min(1).max(64).optional(),
  name: z.string().min(1).max(500).optional(),
  isActive: z.boolean().optional(),
});

export const createSoilSampleSchema = z.object({
  parcelId: z.string().min(1).max(128),
  sampleCode: z.string().min(1).max(128),
  laboratoryId: z.string().uuid().nullable().optional(),
  samplingDate: z.string().min(4).max(64).nullable().optional(),
  analysisDate: z.string().min(4).max(64).nullable().optional(),
  samplingDepthFromCm: nullableNumber,
  samplingDepthToCm: nullableNumber,
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  elevation: nullableNumber,
  samplerName: nullableString,
  sampleMethod: nullableString,
  weatherCondition: nullableString,
  notes: z.string().max(8000).nullable().optional(),
});

export const updateSoilSampleSchema = createSoilSampleSchema.partial();

export const createSoilAnalysisResultSchema = z.object({
  parameterCode: z.string().min(1).max(128),
  parameterName: z.string().min(1).max(500).optional(),
  measuredValue: nullableNumber,
  unit: z.string().min(1).max(64).optional(),
  analysisMethodId: z.string().uuid().nullable().optional(),
  analysisMethod: nullableString,
  detectionLimit: nullableNumber,
  measurementUncertainty: nullableNumber,
  qualityFlag: soilQualityFlagSchema.optional(),
  isAccredited: z.boolean().optional(),
  source: nullableString,
  valueSourceType: z
    .enum(SOIL_VALUE_SOURCE_TYPES as unknown as [string, ...string[]])
    .nullable()
    .optional(),
  verificationStatus: verificationStatusSchema.optional(),
  rawValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  rawUnit: z.string().max(64).nullable().optional(),
  originalParameterName: nullableString,
  originalMethodName: nullableString,
});

export const updateSoilAnalysisResultSchema = createSoilAnalysisResultSchema.partial();

export type CreateLaboratoryInput = z.infer<typeof createLaboratorySchema>;
export type UpdateLaboratoryInput = z.infer<typeof updateLaboratorySchema>;
export type CreateAnalysisMethodInput = z.infer<typeof createAnalysisMethodSchema>;
export type UpdateAnalysisMethodInput = z.infer<typeof updateAnalysisMethodSchema>;
export type CreateSoilSampleInput = z.infer<typeof createSoilSampleSchema>;
export type UpdateSoilSampleInput = z.infer<typeof updateSoilSampleSchema>;
export type CreateSoilAnalysisResultInput = z.infer<typeof createSoilAnalysisResultSchema>;
export type UpdateSoilAnalysisResultInput = z.infer<typeof updateSoilAnalysisResultSchema>;

export class SoilLaboratoryValidationService {
  constructor(
    private readonly repo: SoilLaboratoryRepository,
    private readonly catalog?: SoilParameterCatalogService,
  ) {}

  validateLaboratory(
    row: Laboratory,
    issues: SoilLaboratoryValidationIssue[] = [],
  ): SoilLaboratoryValidationIssue[] {
    if (!row.name?.trim()) {
      issues.push({
        code: 'LABORATORY_NAME_REQUIRED',
        severity: 'error',
        message: 'Laboratory name is required',
        path: 'name',
      });
    }
    if (!row.accreditationNumber) {
      issues.push({
        code: 'ACCREDITATION_UNSET',
        severity: 'warning',
        message: 'AccreditationNumber is not set yet',
        path: 'accreditationNumber',
      });
    }
    return issues;
  }

  validateAnalysisMethod(
    row: AnalysisMethod,
    issues: SoilLaboratoryValidationIssue[] = [],
  ): SoilLaboratoryValidationIssue[] {
    if (!row.code?.trim()) {
      issues.push({
        code: 'METHOD_CODE_REQUIRED',
        severity: 'error',
        message: 'AnalysisMethod code is required',
        path: 'code',
      });
    }
    if (!row.name?.trim()) {
      issues.push({
        code: 'METHOD_NAME_REQUIRED',
        severity: 'error',
        message: 'AnalysisMethod name is required',
        path: 'name',
      });
    }
    return issues;
  }

  validateSample(
    row: SoilSample,
    issues: SoilLaboratoryValidationIssue[] = [],
  ): SoilLaboratoryValidationIssue[] {
    if (!row.parcelId?.trim()) {
      issues.push({
        code: 'PARCEL_ID_REQUIRED',
        severity: 'error',
        message: 'ParcelId is required',
        path: 'parcelId',
      });
    }
    if (!row.sampleCode?.trim()) {
      issues.push({
        code: 'SAMPLE_CODE_REQUIRED',
        severity: 'error',
        message: 'SampleCode is required',
        path: 'sampleCode',
      });
    }
    const from = row.samplingDepthFromCm;
    const to = row.samplingDepthToCm;
    if (from != null && to != null && from > to) {
      issues.push({
        code: 'DEPTH_RANGE_INVALID',
        severity: 'error',
        message: 'SamplingDepthFromCm cannot exceed SamplingDepthToCm',
        path: 'samplingDepthFromCm',
      });
    }
    if (!row.laboratoryId) {
      issues.push({
        code: 'LABORATORY_UNSET',
        severity: 'warning',
        message: 'LaboratoryId is not linked yet',
        path: 'laboratoryId',
      });
    }
    if (!row.samplingDate) {
      issues.push({
        code: 'SAMPLING_DATE_UNSET',
        severity: 'warning',
        message: 'SamplingDate is not set yet',
        path: 'samplingDate',
      });
    }
    return issues;
  }

  validateResult(
    row: SoilAnalysisResult,
    issues: SoilLaboratoryValidationIssue[] = [],
  ): SoilLaboratoryValidationIssue[] {
    if (!row.parameterCode?.trim()) {
      issues.push({
        code: 'PARAMETER_CODE_REQUIRED',
        severity: 'error',
        message: 'ParameterCode is required',
        path: 'parameterCode',
      });
    }
    if (!row.parameterName?.trim()) {
      issues.push({
        code: 'PARAMETER_NAME_REQUIRED',
        severity: 'error',
        message: 'ParameterName is required',
        path: 'parameterName',
      });
    }
    if (!row.unit?.trim()) {
      issues.push({
        code: 'UNIT_REQUIRED',
        severity: 'error',
        message: 'Unit is required',
        path: 'unit',
      });
    }
    if (!SOIL_QUALITY_FLAGS.includes(row.qualityFlag)) {
      issues.push({
        code: 'QUALITY_FLAG_INVALID',
        severity: 'error',
        message: 'Invalid QualityFlag',
        path: 'qualityFlag',
      });
    }
    if (!NORMALIZATION_STATUSES.includes(row.normalizationStatus)) {
      issues.push({
        code: 'NORMALIZATION_STATUS_INVALID',
        severity: 'error',
        message: 'Invalid NormalizationStatus',
        path: 'normalizationStatus',
      });
    }
    if (
      row.valueSourceType != null &&
      !SOIL_VALUE_SOURCE_TYPES.includes(row.valueSourceType)
    ) {
      issues.push({
        code: 'VALUE_SOURCE_TYPE_INVALID',
        severity: 'error',
        message: 'Invalid ValueSourceType',
        path: 'valueSourceType',
      });
    }
    if (row.measuredValue == null && row.rawValue == null) {
      issues.push({
        code: 'MEASURED_VALUE_UNSET',
        severity: 'warning',
        message: 'MeasuredValue/rawValue is not set yet (null is distinct from zero)',
        path: 'measuredValue',
      });
    }
    if (row.verificationStatus === 'Approved') {
      issues.push({
        code: 'PREMATURE_APPROVAL',
        severity: 'error',
        message: 'Approved status is not allowed without expert workflow',
        path: 'verificationStatus',
      });
    }
    return issues;
  }

  async validateSampleAggregate(sampleId: string): Promise<SoilLaboratoryValidationResult> {
    const issues: SoilLaboratoryValidationIssue[] = [];
    const sample = await this.repo.getSampleById(sampleId);
    if (!sample || !sample.isActive) {
      return {
        valid: false,
        sampleId,
        issues: [
          {
            code: 'SOIL_SAMPLE_NOT_FOUND',
            severity: 'error',
            message: 'Soil sample not found',
          },
        ],
      };
    }
    this.validateSample(sample, issues);
    if (sample.laboratoryId) {
      const lab = await this.repo.getLaboratoryById(sample.laboratoryId);
      if (!lab || !lab.isActive) {
        issues.push({
          code: 'LABORATORY_MISSING',
          severity: 'error',
          message: 'Linked laboratory is missing or inactive',
          path: 'laboratoryId',
        });
      }
    }
    const results = await this.repo.listResultsBySampleId(sampleId, true);
    if (results.length === 0) {
      issues.push({
        code: 'RESULTS_EMPTY',
        severity: 'warning',
        message: 'No analysis result rows yet',
      });
    }
    for (const result of results) {
      this.validateResult(result, issues);
      if (this.catalog) {
        const param = await this.repo.getSoilParameterByCode(result.parameterCode);
        if (!param) {
          issues.push({
            code: 'PARAMETER_NOT_IN_CATALOG',
            severity: 'error',
            message: `Parameter ${result.parameterCode} is not in the central catalog`,
            path: 'parameterCode',
          });
        }
      }
    }
    return {
      valid: issues.every((i) => i.severity !== 'error'),
      sampleId,
      issues,
    };
  }
}
