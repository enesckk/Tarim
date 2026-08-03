import { z } from 'zod';
import type { SoilLaboratoryRepository } from '../repositories/soil-laboratory.repository.js';
import {
  IMPORT_VALIDATION_RULE_NAMES,
  IMPORT_VALIDATION_SEVERITIES,
  LABORATORY_IMPORT_ENGINE_TYPES,
  LABORATORY_IMPORT_STATUSES,
  type ImportFile,
  type ImportMapping,
  type ImportSession,
  type ImportValidation,
  type ImportValidationRuleName,
  type LaboratoryImportValidationIssue,
} from '../types/laboratory-import.types.js';

const importTypeSchema = z.enum([
  'CSV',
  'EXCEL',
  'XML',
  'JSON',
  'API',
  'MANUAL',
] as const);

const importStatusSchema = z.enum([
  'CREATED',
  'UPLOADED',
  'VALIDATING',
  'MAPPING',
  'IMPORTING',
  'COMPLETED',
  'FAILED',
  'PARTIALLY_IMPORTED',
] as const);

void LABORATORY_IMPORT_ENGINE_TYPES;
void LABORATORY_IMPORT_STATUSES;
void IMPORT_VALIDATION_SEVERITIES;
void importStatusSchema;

export const uploadImportSessionSchema = z.object({
  laboratoryId: z.string().uuid(),
  importType: importTypeSchema,
  importedBy: z.string().trim().max(500).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
  originalFileName: z.string().trim().min(1).max(1000),
  fileType: z.string().trim().min(1).max(100),
  fileSize: z.number().int().nonnegative().nullable().optional(),
  storagePath: z.string().trim().max(2000).nullable().optional(),
  hash: z.string().trim().min(8).max(128).nullable().optional(),
  encoding: z.string().trim().max(64).nullable().optional(),
  sheetName: z.string().trim().max(200).nullable().optional(),
  delimiter: z.string().trim().max(8).nullable().optional(),
  /** Declared headers for architecture validation (no file parsing). */
  declaredColumns: z.array(z.string().trim().min(1).max(200)).max(500).optional(),
});

export const createImportMappingSchema = z.object({
  laboratoryId: z.string().uuid(),
  externalParameterName: z.string().trim().min(1).max(500),
  externalUnit: z.string().trim().max(100).nullable().optional(),
  internalParameterCode: z.string().trim().max(100).nullable().optional(),
  internalUnit: z.string().trim().max(100).nullable().optional(),
  confidenceScore: z.number().min(0).max(1).nullable().optional(),
  requiresReview: z.boolean().optional(),
});

export const validateImportSessionSchema = z.object({
  /** Declared column headers from the source file (caller-supplied; not parsed). */
  declaredColumns: z.array(z.string().trim().min(1).max(200)).max(500).optional(),
  requiredColumns: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
  /** External parameter names present in the source. */
  externalParameters: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(500),
        unit: z.string().trim().max(100).nullable().optional(),
      }),
    )
    .max(500)
    .optional(),
  /** Sample codes present per row index (1-based). */
  sampleCodes: z
    .array(
      z.object({
        row: z.number().int().positive(),
        sampleCode: z.string().nullable(),
      }),
    )
    .max(5000)
    .optional(),
  /** Raw numeric/date cell samples for format checks (no parser). */
  cellSamples: z
    .array(
      z.object({
        row: z.number().int().positive(),
        column: z.string().trim().min(1).max(200),
        value: z.string().nullable(),
        expect: z.enum(['number', 'date']).optional(),
      }),
    )
    .max(5000)
    .optional(),
  /** Row fingerprints for duplicate detection (caller-supplied). */
  rowFingerprints: z.array(z.string().trim().min(1).max(2000)).max(5000).optional(),
});

export const previewImportSessionSchema = z.object({
  notes: z.string().max(8000).nullable().optional(),
});

export const commitImportSessionSchema = z.object({
  /** Dry-run only in 2.2E — real commit deferred. Always architecture stub. */
  confirm: z.literal(true),
  notes: z.string().max(8000).nullable().optional(),
});

export type UploadImportSessionInput = z.infer<typeof uploadImportSessionSchema>;
export type CreateImportMappingInput = z.infer<typeof createImportMappingSchema>;
export type ValidateImportSessionInput = z.infer<typeof validateImportSessionSchema>;
export type PreviewImportSessionInput = z.infer<typeof previewImportSessionSchema>;
export type CommitImportSessionInput = z.infer<typeof commitImportSessionSchema>;

const SUPPORTED_UPLOAD_TYPES = new Set(['CSV', 'EXCEL', 'XML', 'JSON', 'API', 'MANUAL']);

export class LaboratoryImportValidationService {
  constructor(private readonly repo: SoilLaboratoryRepository) {}

  validateSession(
    row: ImportSession,
    issues: LaboratoryImportValidationIssue[] = [],
  ): LaboratoryImportValidationIssue[] {
    if (!row.sessionCode?.trim()) {
      issues.push({
        code: 'SESSION_CODE_REQUIRED',
        severity: 'error',
        message: 'SessionCode is required',
        path: 'sessionCode',
      });
    }
    if (!row.laboratoryId) {
      issues.push({
        code: 'LABORATORY_ID_REQUIRED',
        severity: 'error',
        message: 'LaboratoryId is required',
        path: 'laboratoryId',
      });
    }
    if (!LABORATORY_IMPORT_ENGINE_TYPES.includes(row.importType)) {
      issues.push({
        code: 'IMPORT_TYPE_INVALID',
        severity: 'error',
        message: 'Invalid ImportType',
        path: 'importType',
      });
    }
    if (!LABORATORY_IMPORT_STATUSES.includes(row.importStatus)) {
      issues.push({
        code: 'IMPORT_STATUS_INVALID',
        severity: 'error',
        message: 'Invalid ImportStatus',
        path: 'importStatus',
      });
    }
    for (const [path, value] of [
      ['totalRows', row.totalRows],
      ['successfulRows', row.successfulRows],
      ['failedRows', row.failedRows],
      ['warningRows', row.warningRows],
      ['executionTimeMs', row.executionTimeMs],
    ] as const) {
      if (value < 0) {
        issues.push({
          code: 'IMPORT_COUNT_INVALID',
          severity: 'error',
          message: `${path} must be >= 0`,
          path,
        });
      }
    }
    return issues;
  }

  validateFile(
    row: ImportFile,
    issues: LaboratoryImportValidationIssue[] = [],
  ): LaboratoryImportValidationIssue[] {
    if (!row.originalFileName?.trim()) {
      issues.push({
        code: 'IMPORT_FILE_NAME_REQUIRED',
        severity: 'error',
        message: 'OriginalFileName is required',
        path: 'originalFileName',
      });
    }
    if (row.fileSize != null && row.fileSize < 0) {
      issues.push({
        code: 'IMPORT_FILE_SIZE_INVALID',
        severity: 'error',
        message: 'FileSize must be >= 0',
        path: 'fileSize',
      });
    }
    return issues;
  }

  validateMapping(
    row: ImportMapping,
    issues: LaboratoryImportValidationIssue[] = [],
  ): LaboratoryImportValidationIssue[] {
    if (!row.externalParameterName?.trim()) {
      issues.push({
        code: 'EXTERNAL_PARAMETER_NAME_REQUIRED',
        severity: 'error',
        message: 'ExternalParameterName is required',
        path: 'externalParameterName',
      });
    }
    if (
      row.confidenceScore != null &&
      (row.confidenceScore < 0 || row.confidenceScore > 1)
    ) {
      issues.push({
        code: 'CONFIDENCE_SCORE_INVALID',
        severity: 'error',
        message: 'ConfidenceScore must be between 0 and 1',
        path: 'confidenceScore',
      });
    }
    return issues;
  }

  validateValidationRow(
    row: ImportValidation,
    issues: LaboratoryImportValidationIssue[] = [],
  ): LaboratoryImportValidationIssue[] {
    if (!IMPORT_VALIDATION_RULE_NAMES.includes(row.ruleName)) {
      issues.push({
        code: 'IMPORT_RULE_NAME_INVALID',
        severity: 'error',
        message: 'Invalid RuleName',
        path: 'ruleName',
      });
    }
    if (!IMPORT_VALIDATION_SEVERITIES.includes(row.severity)) {
      issues.push({
        code: 'IMPORT_SEVERITY_INVALID',
        severity: 'error',
        message: 'Invalid Severity',
        path: 'severity',
      });
    }
    return issues;
  }

  isSupportedImportType(importType: string): boolean {
    return SUPPORTED_UPLOAD_TYPES.has(importType);
  }

  async assertLaboratoryExists(laboratoryId: string): Promise<LaboratoryImportValidationIssue[]> {
    const issues: LaboratoryImportValidationIssue[] = [];
    const lab = await this.repo.getLaboratoryById(laboratoryId);
    if (!lab || !lab.isActive) {
      issues.push({
        code: 'MISSING_LABORATORY',
        severity: 'error',
        message: 'Laboratory not found or inactive',
        path: 'laboratoryId',
      });
    }
    return issues;
  }

  isKnownRule(name: string): name is ImportValidationRuleName {
    return (IMPORT_VALIDATION_RULE_NAMES as readonly string[]).includes(name);
  }
}
