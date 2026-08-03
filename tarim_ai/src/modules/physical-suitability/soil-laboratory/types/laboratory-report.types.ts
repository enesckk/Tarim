/**
 * Phase 2.2D — Laboratory Report Management.
 * Metadata + attachments + approval + import history only.
 * No OCR, PDF parsing, AI interpretation, or Excel mapping.
 */

export type LaboratoryReportFileCategory =
  | 'PDF'
  | 'EXCEL'
  | 'CSV'
  | 'IMAGE'
  | 'SCAN'
  | 'XML'
  | 'JSON';

export const LABORATORY_REPORT_FILE_CATEGORIES: readonly LaboratoryReportFileCategory[] = [
  'PDF',
  'EXCEL',
  'CSV',
  'IMAGE',
  'SCAN',
  'XML',
  'JSON',
] as const;

/** Report lifecycle status (aligned with approval workflow). */
export type LaboratoryReportStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';

export const LABORATORY_REPORT_STATUSES: readonly LaboratoryReportStatus[] = [
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'ARCHIVED',
] as const;

export type LaboratoryApprovalStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';

export const LABORATORY_APPROVAL_STATUSES: readonly LaboratoryApprovalStatus[] = [
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'ARCHIVED',
] as const;

export type LaboratoryImportType = 'MANUAL' | 'EXCEL' | 'CSV' | 'API' | 'OCR';

export const LABORATORY_IMPORT_TYPES: readonly LaboratoryImportType[] = [
  'MANUAL',
  'EXCEL',
  'CSV',
  'API',
  'OCR',
] as const;

export type LaboratoryReport = {
  id: string;
  reportNumber: string;
  reportDate: string | null;
  laboratoryId: string;
  parcelId: string | null;
  sampleId: string | null;
  customerName: string | null;
  requestedBy: string | null;
  approvedBy: string | null;
  status: LaboratoryReportStatus;
  reportLanguage: string | null;
  reportVersion: string | null;
  originalFileName: string | null;
  originalFileType: string | null;
  originalFileSize: number | null;
  fileHash: string | null;
  storagePath: string | null;
  digitalSignature: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type LaboratoryReportAttachment = {
  id: string;
  reportId: string;
  fileName: string;
  fileType: string;
  fileCategory: LaboratoryReportFileCategory;
  storagePath: string;
  fileHash: string;
  pageCount: number | null;
  uploadedAt: string;
  uploadedBy: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type LaboratoryApproval = {
  id: string;
  reportId: string;
  approvedBy: string | null;
  approvalDate: string | null;
  approvalStatus: LaboratoryApprovalStatus;
  approvalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

export type LaboratoryImportHistory = {
  id: string;
  reportId: string;
  importedBy: string | null;
  importedAt: string;
  importType: LaboratoryImportType;
  importedParameterCount: number;
  successfulParameterCount: number;
  failedParameterCount: number;
  warningCount: number;
  executionTimeMs: number;
  logs: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  isActive: boolean;
};

/** Aggregate root read model. */
export type LaboratoryReportAggregate = {
  reportId: string;
  report: LaboratoryReport;
  attachments: LaboratoryReportAttachment[];
  approvals: LaboratoryApproval[];
  importHistory: LaboratoryImportHistory[];
};

export type LaboratoryReportValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
};

export type LaboratoryReportValidationResult = {
  valid: boolean;
  issues: LaboratoryReportValidationIssue[];
  reportId?: string;
};
