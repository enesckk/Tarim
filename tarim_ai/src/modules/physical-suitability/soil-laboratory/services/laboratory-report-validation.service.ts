import { z } from 'zod';
import type { SoilLaboratoryRepository } from '../repositories/soil-laboratory.repository.js';
import {
  LABORATORY_APPROVAL_STATUSES,
  LABORATORY_IMPORT_TYPES,
  LABORATORY_REPORT_FILE_CATEGORIES,
  LABORATORY_REPORT_STATUSES,
  type LaboratoryApproval,
  type LaboratoryApprovalStatus,
  type LaboratoryImportHistory,
  type LaboratoryReport,
  type LaboratoryReportAttachment,
  type LaboratoryReportFileCategory,
  type LaboratoryReportStatus,
  type LaboratoryReportValidationIssue,
  type LaboratoryReportValidationResult,
} from '../types/laboratory-report.types.js';

const fileCategorySchema = z.enum([
  'PDF',
  'EXCEL',
  'CSV',
  'IMAGE',
  'SCAN',
  'XML',
  'JSON',
] as const satisfies readonly LaboratoryReportFileCategory[]);
const reportStatusSchema = z.enum([
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'ARCHIVED',
] as const satisfies readonly LaboratoryReportStatus[]);
const approvalStatusSchema = z.enum([
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'ARCHIVED',
] as const satisfies readonly LaboratoryApprovalStatus[]);

export const createLaboratoryReportSchema = z.object({
  reportNumber: z.string().trim().min(1).max(200),
  reportDate: z.string().datetime().nullable().optional(),
  laboratoryId: z.string().uuid(),
  parcelId: z.string().trim().min(1).max(200).nullable().optional(),
  sampleId: z.string().uuid().nullable().optional(),
  customerName: z.string().trim().max(500).nullable().optional(),
  requestedBy: z.string().trim().max(500).nullable().optional(),
  approvedBy: z.string().trim().max(500).nullable().optional(),
  status: reportStatusSchema.optional(),
  reportLanguage: z.string().trim().max(20).nullable().optional(),
  reportVersion: z.string().trim().max(50).nullable().optional(),
  originalFileName: z.string().trim().max(1000).nullable().optional(),
  originalFileType: z.string().trim().max(100).nullable().optional(),
  originalFileSize: z.number().int().nonnegative().nullable().optional(),
  fileHash: z.string().trim().min(8).max(128).nullable().optional(),
  storagePath: z.string().trim().max(2000).nullable().optional(),
  digitalSignature: z.string().trim().max(4000).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
});

export const updateLaboratoryReportSchema = createLaboratoryReportSchema
  .omit({ reportNumber: true, laboratoryId: true })
  .partial()
  .extend({
    reportNumber: z.string().trim().min(1).max(200).optional(),
    laboratoryId: z.string().uuid().optional(),
  });

export const uploadLaboratoryReportSchema = z.object({
  reportNumber: z.string().trim().min(1).max(200),
  laboratoryId: z.string().uuid(),
  reportDate: z.string().datetime().nullable().optional(),
  parcelId: z.string().trim().min(1).max(200).nullable().optional(),
  sampleId: z.string().uuid().nullable().optional(),
  customerName: z.string().trim().max(500).nullable().optional(),
  requestedBy: z.string().trim().max(500).nullable().optional(),
  reportLanguage: z.string().trim().max(20).nullable().optional(),
  reportVersion: z.string().trim().max(50).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
  /** Optional existing report to attach to; omit to create new. */
  reportId: z.string().uuid().optional(),
  fileName: z.string().trim().min(1).max(1000),
  fileType: z.string().trim().min(1).max(100),
  fileCategory: fileCategorySchema,
  pageCount: z.number().int().nonnegative().nullable().optional(),
  uploadedBy: z.string().trim().max(500).nullable().optional(),
  /** Pre-computed SHA-256 (hex) when content not sent. */
  fileHash: z.string().trim().min(8).max(128).optional(),
  storagePath: z.string().trim().max(2000).optional(),
  /** Optional base64 payload — used only for hash/size; no OCR/parsing. */
  dataBase64: z.string().min(1).optional(),
  originalFileSize: z.number().int().nonnegative().nullable().optional(),
});

export const createLaboratoryApprovalSchema = z.object({
  approvedBy: z.string().trim().max(500).nullable().optional(),
  approvalDate: z.string().datetime().nullable().optional(),
  approvalStatus: approvalStatusSchema,
  approvalNotes: z.string().max(4000).nullable().optional(),
});

export type CreateLaboratoryReportInput = z.infer<typeof createLaboratoryReportSchema>;
export type UpdateLaboratoryReportInput = z.infer<typeof updateLaboratoryReportSchema>;
export type UploadLaboratoryReportInput = z.infer<typeof uploadLaboratoryReportSchema>;
export type CreateLaboratoryApprovalInput = z.infer<typeof createLaboratoryApprovalSchema>;

export class LaboratoryReportValidationService {
  constructor(private readonly repo: SoilLaboratoryRepository) {}

  validateReport(
    row: LaboratoryReport,
    issues: LaboratoryReportValidationIssue[] = [],
  ): LaboratoryReportValidationIssue[] {
    if (!row.reportNumber?.trim()) {
      issues.push({
        code: 'REPORT_NUMBER_REQUIRED',
        severity: 'error',
        message: 'ReportNumber is required',
        path: 'reportNumber',
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
    if (!LABORATORY_REPORT_STATUSES.includes(row.status)) {
      issues.push({
        code: 'REPORT_STATUS_INVALID',
        severity: 'error',
        message: 'Invalid Status',
        path: 'status',
      });
    }
    if (row.originalFileSize != null && row.originalFileSize < 0) {
      issues.push({
        code: 'FILE_SIZE_INVALID',
        severity: 'error',
        message: 'OriginalFileSize must be >= 0',
        path: 'originalFileSize',
      });
    }
    return issues;
  }

  validateAttachment(
    row: LaboratoryReportAttachment,
    issues: LaboratoryReportValidationIssue[] = [],
  ): LaboratoryReportValidationIssue[] {
    if (!row.fileName?.trim()) {
      issues.push({
        code: 'ATTACHMENT_FILE_NAME_REQUIRED',
        severity: 'error',
        message: 'FileName is required',
        path: 'fileName',
      });
    }
    if (!row.fileHash?.trim()) {
      issues.push({
        code: 'ATTACHMENT_HASH_REQUIRED',
        severity: 'error',
        message: 'FileHash is required',
        path: 'fileHash',
      });
    }
    if (!LABORATORY_REPORT_FILE_CATEGORIES.includes(row.fileCategory)) {
      issues.push({
        code: 'FILE_CATEGORY_INVALID',
        severity: 'error',
        message: 'Invalid FileCategory',
        path: 'fileCategory',
      });
    }
    return issues;
  }

  validateApproval(
    row: LaboratoryApproval,
    issues: LaboratoryReportValidationIssue[] = [],
  ): LaboratoryReportValidationIssue[] {
    if (!LABORATORY_APPROVAL_STATUSES.includes(row.approvalStatus)) {
      issues.push({
        code: 'APPROVAL_STATUS_INVALID',
        severity: 'error',
        message: 'Invalid ApprovalStatus',
        path: 'approvalStatus',
      });
    }
    return issues;
  }

  validateImportHistory(
    row: LaboratoryImportHistory,
    issues: LaboratoryReportValidationIssue[] = [],
  ): LaboratoryReportValidationIssue[] {
    if (!LABORATORY_IMPORT_TYPES.includes(row.importType)) {
      issues.push({
        code: 'IMPORT_TYPE_INVALID',
        severity: 'error',
        message: 'Invalid ImportType',
        path: 'importType',
      });
    }
    for (const [path, value] of [
      ['importedParameterCount', row.importedParameterCount],
      ['successfulParameterCount', row.successfulParameterCount],
      ['failedParameterCount', row.failedParameterCount],
      ['warningCount', row.warningCount],
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

  async validateReportUniqueness(
    report: LaboratoryReport,
  ): Promise<LaboratoryReportValidationResult> {
    const issues: LaboratoryReportValidationIssue[] = [];
    this.validateReport(report, issues);

    const lab = await this.repo.getLaboratoryById(report.laboratoryId);
    if (!lab || !lab.isActive) {
      issues.push({
        code: 'LABORATORY_NOT_FOUND',
        severity: 'error',
        message: 'Laboratory not found or inactive',
        path: 'laboratoryId',
      });
    }

    if (report.sampleId) {
      const sample = await this.repo.getSampleById(report.sampleId);
      if (!sample || !sample.isActive) {
        issues.push({
          code: 'SOIL_SAMPLE_NOT_FOUND',
          severity: 'error',
          message: 'Soil sample not found or inactive',
          path: 'sampleId',
        });
      }
    }

    const byNumber = await this.repo.getLaboratoryReportByNumber(
      report.laboratoryId,
      report.reportNumber,
    );
    if (byNumber && byNumber.id !== report.id && byNumber.isActive) {
      issues.push({
        code: 'REPORT_NUMBER_DUPLICATE',
        severity: 'error',
        message: 'ReportNumber already exists for this laboratory',
        path: 'reportNumber',
      });
    }

    if (report.fileHash) {
      const byHash = await this.repo.getLaboratoryReportByFileHash(report.fileHash);
      if (byHash && byHash.id !== report.id && byHash.isActive) {
        issues.push({
          code: 'REPORT_FILE_HASH_DUPLICATE',
          severity: 'error',
          message: 'A report with the same file hash already exists',
          path: 'fileHash',
        });
      }
    }

    return {
      valid: issues.every((i) => i.severity !== 'error'),
      issues,
      reportId: report.id,
    };
  }
}
