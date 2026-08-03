import { createHash, randomUUID } from 'node:crypto';
import type { SoilLaboratoryRepository } from '../repositories/soil-laboratory.repository.js';
import {
  IMPORT_PIPELINE_STAGES,
  type ImportFile,
  type ImportMapping,
  type ImportPreviewDto,
  type ImportSession,
  type ImportValidation,
  type ImportValidationRuleName,
  type ImportValidationSeverity,
  type LaboratoryImport,
} from '../types/laboratory-import.types.js';
import {
  LaboratoryImportValidationService,
  type CommitImportSessionInput,
  type CreateImportMappingInput,
  type PreviewImportSessionInput,
  type UploadImportSessionInput,
  type ValidateImportSessionInput,
} from './laboratory-import-validation.service.js';

function newId() {
  return randomUUID();
}

function httpError(statusCode: number, code: string, message: string, details?: unknown) {
  return Object.assign(new Error(message), { statusCode, code, details });
}

function throwIfInvalid(issues: { severity: string }[], code: string, message: string) {
  const hard = issues.filter((i) => i.severity === 'error');
  if (hard.length > 0) throw httpError(422, code, message, { issues: hard });
}

function sessionCode(): string {
  return `IMP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

/**
 * Phase 2.2E — Import Engine architecture.
 * Pipeline stages transition session status and record validations.
 * Does NOT parse Excel/CSV/XML or commit SoilAnalysisResult rows.
 */
export class LaboratoryImportEngineService {
  readonly validation: LaboratoryImportValidationService;

  constructor(private readonly repo: SoilLaboratoryRepository) {
    this.validation = new LaboratoryImportValidationService(repo);
  }

  listSessions() {
    return this.repo.listImportSessions();
  }

  getSession(id: string) {
    return this.repo.getImportSessionById(id);
  }

  getAggregate(sessionId: string): Promise<LaboratoryImport | null> {
    return this.repo.getLaboratoryImportAggregate(sessionId);
  }

  listValidations(sessionId: string) {
    return this.repo.listImportValidations(sessionId);
  }

  listMappings(laboratoryId: string) {
    return this.repo.listImportMappingsByLaboratory(laboratoryId);
  }

  /** Pipeline stage 1 — Upload (metadata only). */
  async upload(input: UploadImportSessionInput): Promise<LaboratoryImport> {
    const started = Date.now();
    const labIssues = await this.validation.assertLaboratoryExists(input.laboratoryId);
    throwIfInvalid(labIssues, 'MISSING_LABORATORY', 'Laboratory is required for import');

    if (!this.validation.isSupportedImportType(input.importType)) {
      throw httpError(422, 'UNSUPPORTED_FILE_TYPE', 'Unsupported import type');
    }

    const now = new Date().toISOString();
    const session: ImportSession = {
      id: newId(),
      sessionCode: sessionCode(),
      laboratoryId: input.laboratoryId,
      importType: input.importType,
      importStatus: 'CREATED',
      startedAt: now,
      finishedAt: null,
      importedBy: input.importedBy ?? null,
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
      warningRows: 0,
      executionTimeMs: 0,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    throwIfInvalid(
      this.validation.validateSession(session),
      'IMPORT_SESSION_INVALID',
      'Import session invalid',
    );
    await this.repo.upsertImportSession(session);

    const file: ImportFile = {
      id: newId(),
      sessionId: session.id,
      originalFileName: input.originalFileName,
      fileType: input.fileType,
      fileSize: input.fileSize ?? null,
      storagePath: input.storagePath ?? null,
      hash:
        input.hash ??
        createHash('sha256')
          .update(`${input.originalFileName}:${input.fileType}:${input.fileSize ?? 0}`)
          .digest('hex'),
      encoding: input.encoding ?? null,
      sheetName: input.sheetName ?? null,
      delimiter: input.delimiter ?? null,
      uploadedAt: now,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    throwIfInvalid(
      this.validation.validateFile(file),
      'IMPORT_FILE_INVALID',
      'Import file invalid',
    );
    await this.repo.upsertImportFile(file);

    const uploaded: ImportSession = {
      ...session,
      importStatus: 'UPLOADED',
      executionTimeMs: Date.now() - started,
      updatedAt: new Date().toISOString(),
      version: session.version + 1,
    };
    await this.repo.upsertImportSession(uploaded);

    // Optional early structure signal when caller declares columns
    if (input.declaredColumns && input.declaredColumns.length > 0) {
      await this.appendValidation(uploaded.id, {
        ruleName: 'MISSING_COLUMN',
        severity: 'INFO',
        result: 'PASS',
        message: `Declared ${input.declaredColumns.length} columns (architecture; file not parsed)`,
        affectedRow: null,
        affectedColumn: null,
      });
    }

    const aggregate = await this.repo.getLaboratoryImportAggregate(uploaded.id);
    if (!aggregate) {
      throw httpError(500, 'IMPORT_AGGREGATE_MISSING', 'Failed to load import aggregate');
    }
    return aggregate;
  }

  async createMapping(input: CreateImportMappingInput): Promise<ImportMapping> {
    const labIssues = await this.validation.assertLaboratoryExists(input.laboratoryId);
    throwIfInvalid(labIssues, 'MISSING_LABORATORY', 'Laboratory not found');

    let requiresReview = input.requiresReview ?? false;
    const internalParameterCode = input.internalParameterCode ?? null;
    let confidenceScore = input.confidenceScore ?? null;

    if (internalParameterCode) {
      const param = await this.repo.getSoilParameterByCode(internalParameterCode);
      if (!param || !param.isActive) {
        requiresReview = true;
        confidenceScore = confidenceScore ?? 0;
      } else if (confidenceScore == null) {
        confidenceScore = 1;
      }
    } else {
      requiresReview = true;
      confidenceScore = confidenceScore ?? 0;
    }

    if (input.internalUnit) {
      const unit = await this.repo.getMeasurementUnitByCode(input.internalUnit);
      if (!unit || !unit.isActive) {
        requiresReview = true;
      }
    }

    const now = new Date().toISOString();
    const row: ImportMapping = {
      id: newId(),
      laboratoryId: input.laboratoryId,
      externalParameterName: input.externalParameterName.trim(),
      externalUnit: input.externalUnit ?? null,
      internalParameterCode,
      internalUnit: input.internalUnit ?? null,
      confidenceScore,
      requiresReview,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    throwIfInvalid(
      this.validation.validateMapping(row),
      'IMPORT_MAPPING_INVALID',
      'Import mapping invalid',
    );
    return this.repo.upsertImportMapping(row);
  }

  /**
   * Pipeline: Structure Validation → Parameter/Unit Mapping checks → Validation.
   * Operates on caller-supplied metadata — does not read file bytes.
   */
  async validate(
    sessionId: string,
    input: ValidateImportSessionInput,
  ): Promise<LaboratoryImport> {
    const session = await this.requireSession(sessionId);
    const started = Date.now();

    let current = await this.setStatus(session, 'VALIDATING');

    // Clear previous validations for a fresh run
    await this.repo.clearImportValidations(sessionId);

    // MISSING_LABORATORY
    const labIssues = await this.validation.assertLaboratoryExists(current.laboratoryId);
    if (labIssues.length > 0) {
      await this.appendValidation(sessionId, {
        ruleName: 'MISSING_LABORATORY',
        severity: 'CRITICAL',
        result: 'FAIL',
        message: 'Laboratory missing or inactive',
        affectedRow: null,
        affectedColumn: 'laboratoryId',
      });
    } else {
      await this.appendValidation(sessionId, {
        ruleName: 'MISSING_LABORATORY',
        severity: 'INFO',
        result: 'PASS',
        message: 'Laboratory present',
        affectedRow: null,
        affectedColumn: 'laboratoryId',
      });
    }

    // UNSUPPORTED_FILE_TYPE
    if (!this.validation.isSupportedImportType(current.importType)) {
      await this.appendValidation(sessionId, {
        ruleName: 'UNSUPPORTED_FILE_TYPE',
        severity: 'CRITICAL',
        result: 'FAIL',
        message: `ImportType ${current.importType} is not supported`,
        affectedRow: null,
        affectedColumn: 'importType',
      });
    } else {
      await this.appendValidation(sessionId, {
        ruleName: 'UNSUPPORTED_FILE_TYPE',
        severity: 'INFO',
        result: 'PASS',
        message: `ImportType ${current.importType} accepted (parser deferred)`,
        affectedRow: null,
        affectedColumn: 'importType',
      });
    }

    // MISSING_COLUMN
    const required = input.requiredColumns ?? ['SampleCode'];
    const declared = new Set((input.declaredColumns ?? []).map((c) => c.trim()));
    if (input.declaredColumns) {
      for (const col of required) {
        if (!declared.has(col)) {
          await this.appendValidation(sessionId, {
            ruleName: 'MISSING_COLUMN',
            severity: 'ERROR',
            result: 'FAIL',
            message: `Required column missing: ${col}`,
            affectedRow: null,
            affectedColumn: col,
          });
        } else {
          await this.appendValidation(sessionId, {
            ruleName: 'MISSING_COLUMN',
            severity: 'INFO',
            result: 'PASS',
            message: `Column present: ${col}`,
            affectedRow: null,
            affectedColumn: col,
          });
        }
      }
    } else {
      await this.appendValidation(sessionId, {
        ruleName: 'MISSING_COLUMN',
        severity: 'WARNING',
        result: 'SKIPPED',
        message: 'declaredColumns not provided — structure validation skipped (no parser)',
        affectedRow: null,
        affectedColumn: null,
      });
    }

    current = await this.setStatus(current, 'MAPPING');

    // UNKNOWN_PARAMETER / UNKNOWN_UNIT
    const mappings = await this.repo.listImportMappingsByLaboratory(current.laboratoryId);
    const mappingByExternal = new Map(
      mappings.map((m) => [m.externalParameterName.toLowerCase(), m]),
    );

    for (const param of input.externalParameters ?? []) {
      const mapped = mappingByExternal.get(param.name.toLowerCase());
      if (!mapped || !mapped.internalParameterCode) {
        await this.appendValidation(sessionId, {
          ruleName: 'UNKNOWN_PARAMETER',
          severity: 'ERROR',
          result: 'FAIL',
          message: `Unknown / unmapped parameter: ${param.name}`,
          affectedRow: null,
          affectedColumn: param.name,
        });
      } else {
        const catalogParam = await this.repo.getSoilParameterByCode(mapped.internalParameterCode);
        if (!catalogParam || !catalogParam.isActive) {
          await this.appendValidation(sessionId, {
            ruleName: 'UNKNOWN_PARAMETER',
            severity: 'ERROR',
            result: 'FAIL',
            message: `Mapped code ${mapped.internalParameterCode} not in catalog`,
            affectedRow: null,
            affectedColumn: param.name,
          });
        } else {
          await this.appendValidation(sessionId, {
            ruleName: 'UNKNOWN_PARAMETER',
            severity: 'INFO',
            result: 'PASS',
            message: `${param.name} → ${mapped.internalParameterCode}`,
            affectedRow: null,
            affectedColumn: param.name,
          });
        }
      }

      const unitCode = mapped?.internalUnit ?? param.unit ?? null;
      if (unitCode) {
        const unit = await this.repo.getMeasurementUnitByCode(unitCode);
        if (!unit || !unit.isActive) {
          await this.appendValidation(sessionId, {
            ruleName: 'UNKNOWN_UNIT',
            severity: 'ERROR',
            result: 'FAIL',
            message: `Unknown unit: ${unitCode}`,
            affectedRow: null,
            affectedColumn: param.name,
          });
        } else {
          await this.appendValidation(sessionId, {
            ruleName: 'UNKNOWN_UNIT',
            severity: 'INFO',
            result: 'PASS',
            message: `Unit accepted: ${unitCode}`,
            affectedRow: null,
            affectedColumn: param.name,
          });
        }
      } else if (param.unit === null || param.unit === undefined) {
        // no unit declared — informational
        await this.appendValidation(sessionId, {
          ruleName: 'UNKNOWN_UNIT',
          severity: 'WARNING',
          result: 'SKIPPED',
          message: `No unit provided for ${param.name}`,
          affectedRow: null,
          affectedColumn: param.name,
        });
      }
    }

    // MISSING_SAMPLE_CODE
    for (const row of input.sampleCodes ?? []) {
      if (row.sampleCode == null || !String(row.sampleCode).trim()) {
        await this.appendValidation(sessionId, {
          ruleName: 'MISSING_SAMPLE_CODE',
          severity: 'ERROR',
          result: 'FAIL',
          message: 'SampleCode is missing',
          affectedRow: row.row,
          affectedColumn: 'SampleCode',
        });
      }
    }
    if ((input.sampleCodes ?? []).length === 0) {
      await this.appendValidation(sessionId, {
        ruleName: 'MISSING_SAMPLE_CODE',
        severity: 'WARNING',
        result: 'SKIPPED',
        message: 'sampleCodes not provided — rule skipped (no parser)',
        affectedRow: null,
        affectedColumn: 'SampleCode',
      });
    }

    // DUPLICATE_ROW
    const fingerprints = input.rowFingerprints ?? [];
    const seen = new Set<string>();
    for (let i = 0; i < fingerprints.length; i++) {
      const fp = fingerprints[i]!;
      if (seen.has(fp)) {
        await this.appendValidation(sessionId, {
          ruleName: 'DUPLICATE_ROW',
          severity: 'WARNING',
          result: 'FAIL',
          message: 'Duplicate row fingerprint',
          affectedRow: i + 1,
          affectedColumn: null,
        });
      }
      seen.add(fp);
    }
    if (fingerprints.length === 0) {
      await this.appendValidation(sessionId, {
        ruleName: 'DUPLICATE_ROW',
        severity: 'INFO',
        result: 'SKIPPED',
        message: 'rowFingerprints not provided — duplicate check skipped',
        affectedRow: null,
        affectedColumn: null,
      });
    }

    // INVALID_NUMBER_FORMAT / INVALID_DATE_FORMAT
    for (const cell of input.cellSamples ?? []) {
      if (cell.expect === 'number' || cell.expect == null) {
        if (cell.value != null && cell.value !== '' && Number.isNaN(Number(cell.value))) {
          if (cell.expect === 'number') {
            await this.appendValidation(sessionId, {
              ruleName: 'INVALID_NUMBER_FORMAT',
              severity: 'ERROR',
              result: 'FAIL',
              message: `Invalid number: ${cell.value}`,
              affectedRow: cell.row,
              affectedColumn: cell.column,
            });
          }
        }
      }
      if (cell.expect === 'date') {
        const ok =
          cell.value != null &&
          cell.value !== '' &&
          !Number.isNaN(Date.parse(cell.value));
        if (!ok) {
          await this.appendValidation(sessionId, {
            ruleName: 'INVALID_DATE_FORMAT',
            severity: 'ERROR',
            result: 'FAIL',
            message: `Invalid date: ${cell.value ?? 'null'}`,
            affectedRow: cell.row,
            affectedColumn: cell.column,
          });
        }
      }
    }

    current = await this.setStatus(current, 'VALIDATING');
    const validations = await this.repo.listImportValidations(sessionId);
    const hardFails = validations.filter(
      (v) => v.result === 'FAIL' && (v.severity === 'ERROR' || v.severity === 'CRITICAL'),
    );
    const warnings = validations.filter((v) => v.result === 'FAIL' && v.severity === 'WARNING');

    current = await this.repo.upsertImportSession({
      ...current,
      warningRows: warnings.length,
      failedRows: hardFails.length,
      executionTimeMs: current.executionTimeMs + (Date.now() - started),
      updatedAt: new Date().toISOString(),
      version: current.version + 1,
      importStatus: hardFails.length > 0 ? 'FAILED' : current.importStatus,
    });

    // If only soft issues, leave status at VALIDATING for preview/import
    if (hardFails.length === 0) {
      current = await this.setStatus(current, 'VALIDATING');
    }

    const aggregate = await this.repo.getLaboratoryImportAggregate(sessionId);
    if (!aggregate) {
      throw httpError(500, 'IMPORT_AGGREGATE_MISSING', 'Failed to load import aggregate');
    }
    return aggregate;
  }

  /** Pipeline Preview — no row materialization. */
  async preview(
    sessionId: string,
    input: PreviewImportSessionInput = {},
  ): Promise<ImportPreviewDto> {
    const session = await this.requireSession(sessionId);
    if (session.importStatus === 'CREATED') {
      throw httpError(422, 'IMPORT_NOT_UPLOADED', 'Upload before preview');
    }

    const mappings = await this.repo.listImportMappingsByLaboratory(session.laboratoryId);
    const validations = await this.repo.listImportValidations(sessionId);
    const summary = {
      info: validations.filter((v) => v.severity === 'INFO').length,
      warning: validations.filter((v) => v.severity === 'WARNING').length,
      error: validations.filter((v) => v.severity === 'ERROR').length,
      critical: validations.filter((v) => v.severity === 'CRITICAL').length,
    };

    if (input.notes) {
      await this.repo.upsertImportSession({
        ...session,
        notes: input.notes,
        updatedAt: new Date().toISOString(),
        version: session.version + 1,
      });
    }

    return {
      sessionId,
      importStatus: session.importStatus,
      pipelineStage: 'Preview',
      totalRows: session.totalRows,
      mappedParameters: mappings.map((m) => ({
        externalParameterName: m.externalParameterName,
        internalParameterCode: m.internalParameterCode,
        requiresReview: m.requiresReview,
      })),
      validationSummary: summary,
      sampleRows: [],
      message:
        'Phase 2.2E preview is architectural only — parsers and row import are deferred.',
    };
  }

  /**
   * Pipeline Import stub — transitions status, does NOT write analysis results.
   */
  async commitImport(
    sessionId: string,
    input: CommitImportSessionInput,
  ): Promise<LaboratoryImport> {
    if (!input.confirm) {
      throw httpError(400, 'IMPORT_NOT_CONFIRMED', 'confirm=true is required');
    }
    const session = await this.requireSession(sessionId);
    if (session.importStatus === 'CREATED') {
      throw httpError(422, 'IMPORT_NOT_UPLOADED', 'Upload before import');
    }
    if (session.importStatus === 'FAILED') {
      throw httpError(422, 'IMPORT_BLOCKED', 'Session failed validation; cannot import');
    }

    const started = Date.now();
    const current = await this.setStatus(session, 'IMPORTING');

    await this.appendValidation(sessionId, {
      ruleName: 'UNSUPPORTED_FILE_TYPE',
      severity: 'INFO',
      result: 'SKIPPED',
      message:
        'Real import deferred in Phase 2.2E — no SoilAnalysisResult rows were created',
      affectedRow: null,
      affectedColumn: null,
    });

    const now = new Date().toISOString();
    await this.repo.upsertImportSession({
      ...current,
      importStatus: 'COMPLETED',
      finishedAt: now,
      successfulRows: 0,
      failedRows: current.failedRows,
      totalRows: current.totalRows,
      notes:
        input.notes ??
        current.notes ??
        'Architecture stub: import acknowledged without materializing results',
      executionTimeMs: current.executionTimeMs + (Date.now() - started),
      updatedAt: now,
      version: current.version + 1,
    });

    const aggregate = await this.repo.getLaboratoryImportAggregate(sessionId);
    if (!aggregate) {
      throw httpError(500, 'IMPORT_AGGREGATE_MISSING', 'Failed to load import aggregate');
    }
    return aggregate;
  }

  private async requireSession(sessionId: string): Promise<ImportSession> {
    const session = await this.repo.getImportSessionById(sessionId);
    if (!session) {
      throw httpError(404, 'IMPORT_SESSION_NOT_FOUND', 'Import session not found');
    }
    return session;
  }

  private async setStatus(
    session: ImportSession,
    importStatus: ImportSession['importStatus'],
  ): Promise<ImportSession> {
    const next = {
      ...session,
      importStatus,
      updatedAt: new Date().toISOString(),
      version: session.version + 1,
    };
    return this.repo.upsertImportSession(next);
  }

  private async appendValidation(
    sessionId: string,
    input: {
      ruleName: ImportValidationRuleName;
      severity: ImportValidationSeverity;
      result: ImportValidation['result'];
      message: string;
      affectedRow: number | null;
      affectedColumn: string | null;
    },
  ): Promise<ImportValidation> {
    const now = new Date().toISOString();
    const row: ImportValidation = {
      id: newId(),
      sessionId,
      ruleName: input.ruleName,
      severity: input.severity,
      result: input.result,
      message: input.message,
      affectedRow: input.affectedRow,
      affectedColumn: input.affectedColumn,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    throwIfInvalid(
      this.validation.validateValidationRow(row),
      'IMPORT_VALIDATION_INVALID',
      'Import validation row invalid',
    );
    return this.repo.upsertImportValidation(row);
  }
}

/** Phase 2.2E seed: no import sessions. */
export async function seedLaboratoryImportEngine(
  _repo: SoilLaboratoryRepository,
): Promise<void> {
  // intentionally empty
}

export { IMPORT_PIPELINE_STAGES };
