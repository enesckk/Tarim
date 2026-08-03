import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SoilLaboratoryRepository } from '../repositories/soil-laboratory.repository.js';
import type {
  LaboratoryApproval,
  LaboratoryImportHistory,
  LaboratoryReport,
  LaboratoryReportAggregate,
  LaboratoryReportAttachment,
} from '../types/laboratory-report.types.js';
import {
  LaboratoryReportValidationService,
  type CreateLaboratoryApprovalInput,
  type CreateLaboratoryReportInput,
  type UpdateLaboratoryReportInput,
  type UploadLaboratoryReportInput,
} from './laboratory-report-validation.service.js';

const STORAGE_ROOT = join(process.cwd(), 'storage', 'laboratory-reports');

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

function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Phase 2.2D — Laboratory Report Management.
 * No OCR, PDF parsing, AI, or Excel parameter mapping.
 */
export class LaboratoryReportService {
  readonly validation: LaboratoryReportValidationService;

  constructor(private readonly repo: SoilLaboratoryRepository) {
    this.validation = new LaboratoryReportValidationService(repo);
  }

  listReports(activeOnly = true) {
    return this.repo.listLaboratoryReports(activeOnly);
  }

  getReport(id: string) {
    return this.repo.getLaboratoryReportById(id);
  }

  getAggregate(id: string): Promise<LaboratoryReportAggregate | null> {
    return this.repo.getLaboratoryReportAggregate(id);
  }

  listAttachments(reportId: string) {
    return this.repo.listLaboratoryReportAttachments(reportId, true);
  }

  async createReport(input: CreateLaboratoryReportInput): Promise<LaboratoryReport> {
    const now = new Date().toISOString();
    const row: LaboratoryReport = {
      id: newId(),
      reportNumber: input.reportNumber.trim(),
      reportDate: input.reportDate ?? null,
      laboratoryId: input.laboratoryId,
      parcelId: input.parcelId ?? null,
      sampleId: input.sampleId ?? null,
      customerName: input.customerName ?? null,
      requestedBy: input.requestedBy ?? null,
      approvedBy: input.approvedBy ?? null,
      status: input.status ?? 'PENDING',
      reportLanguage: input.reportLanguage ?? null,
      reportVersion: input.reportVersion ?? null,
      originalFileName: input.originalFileName ?? null,
      originalFileType: input.originalFileType ?? null,
      originalFileSize: input.originalFileSize ?? null,
      fileHash: input.fileHash ?? null,
      storagePath: input.storagePath ?? null,
      digitalSignature: input.digitalSignature ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };

    const uniqueness = await this.validation.validateReportUniqueness(row);
    throwIfInvalid(uniqueness.issues, 'LABORATORY_REPORT_INVALID', 'Laboratory report invalid');

    await this.repo.upsertLaboratoryReport(row);

    const approval: LaboratoryApproval = {
      id: newId(),
      reportId: row.id,
      approvedBy: null,
      approvalDate: null,
      approvalStatus: 'PENDING',
      approvalNotes: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };
    throwIfInvalid(
      this.validation.validateApproval(approval),
      'LABORATORY_APPROVAL_INVALID',
      'Laboratory approval invalid',
    );
    await this.repo.upsertLaboratoryApproval(approval);

    return row;
  }

  async updateReport(id: string, input: UpdateLaboratoryReportInput): Promise<LaboratoryReport> {
    const existing = await this.repo.getLaboratoryReportById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'LABORATORY_REPORT_NOT_FOUND', 'Laboratory report not found');
    }

    const now = new Date().toISOString();
    const next: LaboratoryReport = {
      ...existing,
      reportNumber:
        input.reportNumber !== undefined ? input.reportNumber.trim() : existing.reportNumber,
      reportDate: input.reportDate !== undefined ? input.reportDate : existing.reportDate,
      laboratoryId:
        input.laboratoryId !== undefined ? input.laboratoryId : existing.laboratoryId,
      parcelId: input.parcelId !== undefined ? input.parcelId : existing.parcelId,
      sampleId: input.sampleId !== undefined ? input.sampleId : existing.sampleId,
      customerName:
        input.customerName !== undefined ? input.customerName : existing.customerName,
      requestedBy: input.requestedBy !== undefined ? input.requestedBy : existing.requestedBy,
      approvedBy: input.approvedBy !== undefined ? input.approvedBy : existing.approvedBy,
      status: input.status !== undefined ? input.status : existing.status,
      reportLanguage:
        input.reportLanguage !== undefined ? input.reportLanguage : existing.reportLanguage,
      reportVersion:
        input.reportVersion !== undefined ? input.reportVersion : existing.reportVersion,
      originalFileName:
        input.originalFileName !== undefined
          ? input.originalFileName
          : existing.originalFileName,
      originalFileType:
        input.originalFileType !== undefined
          ? input.originalFileType
          : existing.originalFileType,
      originalFileSize:
        input.originalFileSize !== undefined
          ? input.originalFileSize
          : existing.originalFileSize,
      // Never clear an established fileHash via accidental null overwrite from partial updates
      // unless explicitly provided; once set, prefer keeping unless new hash given.
      fileHash: input.fileHash !== undefined ? input.fileHash : existing.fileHash,
      storagePath: input.storagePath !== undefined ? input.storagePath : existing.storagePath,
      digitalSignature:
        input.digitalSignature !== undefined
          ? input.digitalSignature
          : existing.digitalSignature,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: now,
      version: existing.version + 1,
    };

    const uniqueness = await this.validation.validateReportUniqueness(next);
    throwIfInvalid(uniqueness.issues, 'LABORATORY_REPORT_INVALID', 'Laboratory report invalid');

    return this.repo.upsertLaboratoryReport(next);
  }

  /** Soft delete — physical row retained with isActive=false. */
  async deleteReport(id: string): Promise<LaboratoryReport> {
    const existing = await this.repo.getLaboratoryReportById(id);
    if (!existing || !existing.isActive) {
      throw httpError(404, 'LABORATORY_REPORT_NOT_FOUND', 'Laboratory report not found');
    }
    const now = new Date().toISOString();
    return this.repo.upsertLaboratoryReport({
      ...existing,
      isActive: false,
      updatedAt: now,
      version: existing.version + 1,
    });
  }

  /**
   * Register report file metadata (+ optional bytes for hash).
   * Does not parse PDF/Excel/CSV or run OCR/AI.
   */
  async uploadReport(input: UploadLaboratoryReportInput): Promise<LaboratoryReportAggregate> {
    const started = Date.now();
    let buffer: Buffer | null = null;
    let fileHash = input.fileHash?.trim() ?? null;
    let fileSize = input.originalFileSize ?? null;
    let storagePath = input.storagePath?.trim() ?? null;

    if (input.dataBase64) {
      const cleaned = input.dataBase64.replace(/^data:[^;]+;base64,/, '');
      try {
        buffer = Buffer.from(cleaned, 'base64');
      } catch {
        throw httpError(400, 'INVALID_BASE64', 'Invalid base64 file payload');
      }
      if (buffer.length === 0) {
        throw httpError(400, 'EMPTY_FILE', 'Uploaded file content is empty');
      }
      fileHash = sha256Hex(buffer);
      fileSize = buffer.length;
    }

    if (!fileHash) {
      throw httpError(
        422,
        'FILE_HASH_REQUIRED',
        'Provide fileHash or dataBase64 so duplicate detection can run',
      );
    }

    const duplicateReport = await this.repo.getLaboratoryReportByFileHash(fileHash);
    if (
      duplicateReport?.isActive &&
      (!input.reportId || input.reportId !== duplicateReport.id)
    ) {
      throw httpError(
        422,
        'REPORT_FILE_HASH_DUPLICATE',
        'A report with the same file hash already exists',
        { existingReportId: duplicateReport.id },
      );
    }

    let report: LaboratoryReport;
    if (input.reportId) {
      const existing = await this.repo.getLaboratoryReportById(input.reportId);
      if (!existing || !existing.isActive) {
        throw httpError(404, 'LABORATORY_REPORT_NOT_FOUND', 'Laboratory report not found');
      }
      // Keep primary fileHash/storage on the report; additional files are attachments only.
      report = await this.updateReport(existing.id, {
        originalFileName: existing.originalFileName ?? input.fileName,
        originalFileType: existing.originalFileType ?? input.fileType,
        originalFileSize: existing.originalFileSize ?? fileSize,
        fileHash: existing.fileHash ?? fileHash,
        storagePath: existing.storagePath ?? storagePath ?? null,
        parcelId: input.parcelId !== undefined ? input.parcelId : existing.parcelId,
        sampleId: input.sampleId !== undefined ? input.sampleId : existing.sampleId,
        customerName:
          input.customerName !== undefined ? input.customerName : existing.customerName,
        requestedBy:
          input.requestedBy !== undefined ? input.requestedBy : existing.requestedBy,
        reportLanguage:
          input.reportLanguage !== undefined ? input.reportLanguage : existing.reportLanguage,
        reportVersion:
          input.reportVersion !== undefined ? input.reportVersion : existing.reportVersion,
        notes: input.notes !== undefined ? input.notes : existing.notes,
        reportDate: input.reportDate !== undefined ? input.reportDate : existing.reportDate,
      });
    } else {
      report = await this.createReport({
        reportNumber: input.reportNumber,
        laboratoryId: input.laboratoryId,
        reportDate: input.reportDate ?? null,
        parcelId: input.parcelId ?? null,
        sampleId: input.sampleId ?? null,
        customerName: input.customerName ?? null,
        requestedBy: input.requestedBy ?? null,
        reportLanguage: input.reportLanguage ?? null,
        reportVersion: input.reportVersion ?? null,
        notes: input.notes ?? null,
        originalFileName: input.fileName,
        originalFileType: input.fileType,
        originalFileSize: fileSize,
        fileHash,
        storagePath: null,
        status: 'PENDING',
      });
    }

    if (buffer) {
      await mkdir(STORAGE_ROOT, { recursive: true });
      const safeName = input.fileName.replace(/[^\w.-]+/g, '_');
      storagePath = join(STORAGE_ROOT, `${report.id}_${Date.now()}_${safeName}`);
      await writeFile(storagePath, buffer);
      if (!report.storagePath) {
        report = await this.repo.upsertLaboratoryReport({
          ...report,
          storagePath,
          originalFileSize: report.originalFileSize ?? fileSize,
          fileHash: report.fileHash ?? fileHash,
          updatedAt: new Date().toISOString(),
          version: report.version + 1,
        });
      }
    } else if (!report.storagePath && storagePath) {
      report = await this.repo.upsertLaboratoryReport({
        ...report,
        storagePath,
        updatedAt: new Date().toISOString(),
        version: report.version + 1,
      });
    }

    const now = new Date().toISOString();
    const attachmentPath = report.storagePath ?? storagePath ?? `pending://${report.id}/${input.fileName}`;
    const attachment: LaboratoryReportAttachment = {
      id: newId(),
      reportId: report.id,
      fileName: input.fileName,
      fileType: input.fileType,
      fileCategory: input.fileCategory,
      storagePath: attachmentPath,
      fileHash,
      pageCount: input.pageCount ?? null,
      uploadedAt: now,
      uploadedBy: input.uploadedBy ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    throwIfInvalid(
      this.validation.validateAttachment(attachment),
      'LABORATORY_ATTACHMENT_INVALID',
      'Laboratory report attachment invalid',
    );
    await this.repo.upsertLaboratoryReportAttachment(attachment);

    const history: LaboratoryImportHistory = {
      id: newId(),
      reportId: report.id,
      importedBy: input.uploadedBy ?? null,
      importedAt: now,
      importType: 'MANUAL',
      importedParameterCount: 0,
      successfulParameterCount: 0,
      failedParameterCount: 0,
      warningCount: 0,
      executionTimeMs: Date.now() - started,
      logs: 'Phase 2.2D upload registered metadata only; no parameter parsing performed.',
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };
    throwIfInvalid(
      this.validation.validateImportHistory(history),
      'LABORATORY_IMPORT_HISTORY_INVALID',
      'Import history invalid',
    );
    await this.repo.upsertLaboratoryImportHistory(history);

    const aggregate = await this.repo.getLaboratoryReportAggregate(report.id);
    if (!aggregate) {
      throw httpError(500, 'LABORATORY_REPORT_AGGREGATE_MISSING', 'Failed to load report aggregate');
    }
    return aggregate;
  }

  async addApproval(
    reportId: string,
    input: CreateLaboratoryApprovalInput,
  ): Promise<LaboratoryApproval> {
    const report = await this.repo.getLaboratoryReportById(reportId);
    if (!report || !report.isActive) {
      throw httpError(404, 'LABORATORY_REPORT_NOT_FOUND', 'Laboratory report not found');
    }
    const now = new Date().toISOString();
    const row: LaboratoryApproval = {
      id: newId(),
      reportId,
      approvedBy: input.approvedBy ?? null,
      approvalDate: input.approvalDate ?? now,
      approvalStatus: input.approvalStatus,
      approvalNotes: input.approvalNotes ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isActive: true,
    };
    throwIfInvalid(
      this.validation.validateApproval(row),
      'LABORATORY_APPROVAL_INVALID',
      'Laboratory approval invalid',
    );
    await this.repo.upsertLaboratoryApproval(row);
    await this.repo.upsertLaboratoryReport({
      ...report,
      status: input.approvalStatus,
      approvedBy:
        input.approvalStatus === 'APPROVED'
          ? (input.approvedBy ?? report.approvedBy)
          : report.approvedBy,
      updatedAt: now,
      version: report.version + 1,
    });
    return row;
  }
}

/** Phase 2.2D seed: no laboratory reports. */
export async function seedLaboratoryReportManagement(
  _repo: SoilLaboratoryRepository,
): Promise<void> {
  // intentionally empty
}
