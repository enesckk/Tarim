/**
 * Phase 2.2E — Professional Laboratory Import Engine (architecture only).
 * No OCR, AI, PDF parsing, Excel/CSV/XML parsers, or real row import.
 */

export type LaboratoryImportStatus =
  | 'CREATED'
  | 'UPLOADED'
  | 'VALIDATING'
  | 'MAPPING'
  | 'IMPORTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PARTIALLY_IMPORTED';

export const LABORATORY_IMPORT_STATUSES: readonly LaboratoryImportStatus[] = [
  'CREATED',
  'UPLOADED',
  'VALIDATING',
  'MAPPING',
  'IMPORTING',
  'COMPLETED',
  'FAILED',
  'PARTIALLY_IMPORTED',
] as const;

export type LaboratoryImportEngineType =
  | 'CSV'
  | 'EXCEL'
  | 'XML'
  | 'JSON'
  | 'API'
  | 'MANUAL';

export const LABORATORY_IMPORT_ENGINE_TYPES: readonly LaboratoryImportEngineType[] = [
  'CSV',
  'EXCEL',
  'XML',
  'JSON',
  'API',
  'MANUAL',
] as const;

export type ImportValidationSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export const IMPORT_VALIDATION_SEVERITIES: readonly ImportValidationSeverity[] = [
  'INFO',
  'WARNING',
  'ERROR',
  'CRITICAL',
] as const;

export type ImportValidationResultKind = 'PASS' | 'FAIL' | 'SKIPPED';

export const IMPORT_VALIDATION_RESULT_KINDS: readonly ImportValidationResultKind[] = [
  'PASS',
  'FAIL',
  'SKIPPED',
] as const;

/** Named validation rules — catalogued for the pipeline (no file parsing). */
export type ImportValidationRuleName =
  | 'MISSING_COLUMN'
  | 'UNKNOWN_PARAMETER'
  | 'UNKNOWN_UNIT'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'DUPLICATE_ROW'
  | 'MISSING_SAMPLE_CODE'
  | 'MISSING_LABORATORY'
  | 'INVALID_NUMBER_FORMAT'
  | 'INVALID_DATE_FORMAT';

export const IMPORT_VALIDATION_RULE_NAMES: readonly ImportValidationRuleName[] = [
  'MISSING_COLUMN',
  'UNKNOWN_PARAMETER',
  'UNKNOWN_UNIT',
  'UNSUPPORTED_FILE_TYPE',
  'DUPLICATE_ROW',
  'MISSING_SAMPLE_CODE',
  'MISSING_LABORATORY',
  'INVALID_NUMBER_FORMAT',
  'INVALID_DATE_FORMAT',
] as const;

export type ImportPipelineStage =
  | 'Upload'
  | 'StructureValidation'
  | 'ParameterMapping'
  | 'UnitMapping'
  | 'Normalization'
  | 'Validation'
  | 'Preview'
  | 'Import';

export const IMPORT_PIPELINE_STAGES: readonly ImportPipelineStage[] = [
  'Upload',
  'StructureValidation',
  'ParameterMapping',
  'UnitMapping',
  'Normalization',
  'Validation',
  'Preview',
  'Import',
] as const;

export type ImportSession = {
  id: string;
  sessionCode: string;
  laboratoryId: string;
  importType: LaboratoryImportEngineType;
  importStatus: LaboratoryImportStatus;
  startedAt: string | null;
  finishedAt: string | null;
  importedBy: string | null;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  warningRows: number;
  executionTimeMs: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type ImportFile = {
  id: string;
  sessionId: string;
  originalFileName: string;
  fileType: string;
  fileSize: number | null;
  storagePath: string | null;
  hash: string | null;
  encoding: string | null;
  sheetName: string | null;
  delimiter: string | null;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type ImportMapping = {
  id: string;
  laboratoryId: string;
  externalParameterName: string;
  externalUnit: string | null;
  internalParameterCode: string | null;
  internalUnit: string | null;
  confidenceScore: number | null;
  requiresReview: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type ImportValidation = {
  id: string;
  sessionId: string;
  ruleName: ImportValidationRuleName;
  severity: ImportValidationSeverity;
  result: ImportValidationResultKind;
  message: string;
  affectedRow: number | null;
  affectedColumn: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

/** Aggregate root read model. */
export type LaboratoryImport = {
  sessionId: string;
  session: ImportSession;
  files: ImportFile[];
  mappings: ImportMapping[];
  validations: ImportValidation[];
  pipeline: readonly ImportPipelineStage[];
};

export type ImportPreviewDto = {
  sessionId: string;
  importStatus: LaboratoryImportStatus;
  pipelineStage: ImportPipelineStage;
  totalRows: number;
  mappedParameters: Array<{
    externalParameterName: string;
    internalParameterCode: string | null;
    requiresReview: boolean;
  }>;
  validationSummary: {
    info: number;
    warning: number;
    error: number;
    critical: number;
  };
  /** Always empty in Phase 2.2E — parsers not implemented. */
  sampleRows: unknown[];
  message: string;
};

export type LaboratoryImportValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
};
