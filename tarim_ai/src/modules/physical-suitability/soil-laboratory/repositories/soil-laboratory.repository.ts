import type {
  AnalysisMethod,
  Laboratory,
  SoilAnalysis,
  SoilAnalysisResult,
  SoilSample,
} from '../types/soil-laboratory.types.js';
import type {
  MeasurementUnit,
  SoilParameter,
  SoilParameterAlias,
  SoilParameterOption,
  SoilParameterUnit,
} from '../types/soil-parameter.types.js';
import type {
  LaboratoryApproval,
  LaboratoryImportHistory,
  LaboratoryReport,
  LaboratoryReportAggregate,
  LaboratoryReportAttachment,
} from '../types/laboratory-report.types.js';
import type {
  ImportFile,
  ImportMapping,
  ImportSession,
  ImportValidation,
  LaboratoryImport,
} from '../types/laboratory-import.types.js';
import { IMPORT_PIPELINE_STAGES } from '../types/laboratory-import.types.js';

export interface SoilLaboratoryRepository {
  listLaboratories(activeOnly?: boolean): Promise<Laboratory[]>;
  getLaboratoryById(id: string): Promise<Laboratory | null>;
  upsertLaboratory(row: Laboratory): Promise<Laboratory>;

  listAnalysisMethods(activeOnly?: boolean): Promise<AnalysisMethod[]>;
  getAnalysisMethodById(id: string): Promise<AnalysisMethod | null>;
  getAnalysisMethodByCode(code: string): Promise<AnalysisMethod | null>;
  upsertAnalysisMethod(row: AnalysisMethod): Promise<AnalysisMethod>;

  listSamples(activeOnly?: boolean): Promise<SoilSample[]>;
  listSamplesByParcelId(parcelId: string, activeOnly?: boolean): Promise<SoilSample[]>;
  getSampleById(id: string): Promise<SoilSample | null>;
  getSampleByCode(sampleCode: string): Promise<SoilSample | null>;
  upsertSample(row: SoilSample): Promise<SoilSample>;

  listResultsBySampleId(sampleId: string, activeOnly?: boolean): Promise<SoilAnalysisResult[]>;
  getResultById(id: string): Promise<SoilAnalysisResult | null>;
  upsertResult(row: SoilAnalysisResult): Promise<SoilAnalysisResult>;

  getSoilAnalysis(sampleId: string): Promise<SoilAnalysis | null>;

  listMeasurementUnits(activeOnly?: boolean): Promise<MeasurementUnit[]>;
  getMeasurementUnitById(id: string): Promise<MeasurementUnit | null>;
  getMeasurementUnitByCode(code: string): Promise<MeasurementUnit | null>;
  upsertMeasurementUnit(row: MeasurementUnit): Promise<MeasurementUnit>;

  listSoilParameters(activeOnly?: boolean): Promise<SoilParameter[]>;
  getSoilParameterById(id: string): Promise<SoilParameter | null>;
  getSoilParameterByCode(code: string): Promise<SoilParameter | null>;
  upsertSoilParameter(row: SoilParameter): Promise<SoilParameter>;

  listParameterUnits(parameterId: string, activeOnly?: boolean): Promise<SoilParameterUnit[]>;
  upsertParameterUnit(row: SoilParameterUnit): Promise<SoilParameterUnit>;

  listParameterAliases(activeOnly?: boolean): Promise<SoilParameterAlias[]>;
  getParameterAliasById(id: string): Promise<SoilParameterAlias | null>;
  upsertParameterAlias(row: SoilParameterAlias): Promise<SoilParameterAlias>;

  listParameterOptions(parameterId: string, activeOnly?: boolean): Promise<SoilParameterOption[]>;
  upsertParameterOption(row: SoilParameterOption): Promise<SoilParameterOption>;

  listLaboratoryReports(activeOnly?: boolean): Promise<LaboratoryReport[]>;
  getLaboratoryReportById(id: string): Promise<LaboratoryReport | null>;
  getLaboratoryReportByNumber(
    laboratoryId: string,
    reportNumber: string,
  ): Promise<LaboratoryReport | null>;
  getLaboratoryReportByFileHash(fileHash: string): Promise<LaboratoryReport | null>;
  upsertLaboratoryReport(row: LaboratoryReport): Promise<LaboratoryReport>;

  listLaboratoryReportAttachments(
    reportId: string,
    activeOnly?: boolean,
  ): Promise<LaboratoryReportAttachment[]>;
  getLaboratoryReportAttachmentById(id: string): Promise<LaboratoryReportAttachment | null>;
  upsertLaboratoryReportAttachment(
    row: LaboratoryReportAttachment,
  ): Promise<LaboratoryReportAttachment>;

  listLaboratoryApprovals(reportId: string, activeOnly?: boolean): Promise<LaboratoryApproval[]>;
  upsertLaboratoryApproval(row: LaboratoryApproval): Promise<LaboratoryApproval>;

  listLaboratoryImportHistory(
    reportId: string,
    activeOnly?: boolean,
  ): Promise<LaboratoryImportHistory[]>;
  upsertLaboratoryImportHistory(row: LaboratoryImportHistory): Promise<LaboratoryImportHistory>;

  getLaboratoryReportAggregate(reportId: string): Promise<LaboratoryReportAggregate | null>;

  listImportSessions(): Promise<ImportSession[]>;
  getImportSessionById(id: string): Promise<ImportSession | null>;
  getImportSessionByCode(sessionCode: string): Promise<ImportSession | null>;
  upsertImportSession(row: ImportSession): Promise<ImportSession>;

  listImportFiles(sessionId: string): Promise<ImportFile[]>;
  upsertImportFile(row: ImportFile): Promise<ImportFile>;

  listImportMappingsByLaboratory(laboratoryId: string): Promise<ImportMapping[]>;
  getImportMappingById(id: string): Promise<ImportMapping | null>;
  upsertImportMapping(row: ImportMapping): Promise<ImportMapping>;

  listImportValidations(sessionId: string): Promise<ImportValidation[]>;
  upsertImportValidation(row: ImportValidation): Promise<ImportValidation>;
  clearImportValidations(sessionId: string): Promise<void>;

  getLaboratoryImportAggregate(sessionId: string): Promise<LaboratoryImport | null>;

  clear?(): void;
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

export class InMemorySoilLaboratoryRepository implements SoilLaboratoryRepository {
  private laboratories = new Map<string, Laboratory>();
  private methods = new Map<string, AnalysisMethod>();
  private samples = new Map<string, SoilSample>();
  private results = new Map<string, SoilAnalysisResult>();
  private units = new Map<string, MeasurementUnit>();
  private parameters = new Map<string, SoilParameter>();
  private parameterUnits = new Map<string, SoilParameterUnit>();
  private aliases = new Map<string, SoilParameterAlias>();
  private options = new Map<string, SoilParameterOption>();
  private reports = new Map<string, LaboratoryReport>();
  private reportAttachments = new Map<string, LaboratoryReportAttachment>();
  private reportApprovals = new Map<string, LaboratoryApproval>();
  private importHistory = new Map<string, LaboratoryImportHistory>();
  private importSessions = new Map<string, ImportSession>();
  private importFiles = new Map<string, ImportFile>();
  private importMappings = new Map<string, ImportMapping>();
  private importValidations = new Map<string, ImportValidation>();

  async listLaboratories(activeOnly = true) {
    return [...this.laboratories.values()]
      .filter((r) => (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getLaboratoryById(id: string) {
    const row = this.laboratories.get(id);
    return row ? clone(row) : null;
  }

  async upsertLaboratory(row: Laboratory) {
    this.laboratories.set(row.id, clone(row));
    return clone(row);
  }

  async listAnalysisMethods(activeOnly = true) {
    return [...this.methods.values()]
      .filter((r) => (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  async getAnalysisMethodById(id: string) {
    const row = this.methods.get(id);
    return row ? clone(row) : null;
  }

  async getAnalysisMethodByCode(code: string) {
    const rows = [...this.methods.values()]
      .filter((r) => r.code === code && r.isActive)
      .sort((a, b) => b.version - a.version);
    return rows[0] ? clone(rows[0]) : null;
  }

  async upsertAnalysisMethod(row: AnalysisMethod) {
    this.methods.set(row.id, clone(row));
    return clone(row);
  }

  async listSamples(activeOnly = true) {
    return [...this.samples.values()]
      .filter((r) => (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.sampleCode.localeCompare(b.sampleCode));
  }

  async listSamplesByParcelId(parcelId: string, activeOnly = true) {
    return [...this.samples.values()]
      .filter((r) => r.parcelId === parcelId && (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.sampleCode.localeCompare(b.sampleCode));
  }

  async getSampleById(id: string) {
    const row = this.samples.get(id);
    return row ? clone(row) : null;
  }

  async getSampleByCode(sampleCode: string) {
    const rows = [...this.samples.values()]
      .filter((r) => r.sampleCode === sampleCode && r.isActive)
      .sort((a, b) => b.version - a.version);
    return rows[0] ? clone(rows[0]) : null;
  }

  async upsertSample(row: SoilSample) {
    this.samples.set(row.id, clone(row));
    return clone(row);
  }

  async listResultsBySampleId(sampleId: string, activeOnly = true) {
    return [...this.results.values()]
      .filter((r) => r.sampleId === sampleId && (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.parameterCode.localeCompare(b.parameterCode));
  }

  async getResultById(id: string) {
    const row = this.results.get(id);
    return row ? clone(row) : null;
  }

  async upsertResult(row: SoilAnalysisResult) {
    this.results.set(row.id, clone(row));
    return clone(row);
  }

  async getSoilAnalysis(sampleId: string): Promise<SoilAnalysis | null> {
    const sample = await this.getSampleById(sampleId);
    if (!sample || !sample.isActive) return null;
    const results = await this.listResultsBySampleId(sampleId, true);
    const laboratory = sample.laboratoryId
      ? await this.getLaboratoryById(sample.laboratoryId)
      : null;
    return {
      sampleId: sample.id,
      parcelId: sample.parcelId,
      sample,
      results,
      laboratory: laboratory && laboratory.isActive ? laboratory : null,
    };
  }

  async listMeasurementUnits(activeOnly = true) {
    return [...this.units.values()]
      .filter((r) => (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  async getMeasurementUnitById(id: string) {
    const row = this.units.get(id);
    return row ? clone(row) : null;
  }

  async getMeasurementUnitByCode(code: string) {
    const rows = [...this.units.values()]
      .filter((r) => r.code === code && r.isActive)
      .sort((a, b) => b.version - a.version);
    return rows[0] ? clone(rows[0]) : null;
  }

  async upsertMeasurementUnit(row: MeasurementUnit) {
    this.units.set(row.id, clone(row));
    return clone(row);
  }

  async listSoilParameters(activeOnly = true) {
    return [...this.parameters.values()]
      .filter((r) => (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.code.localeCompare(b.code));
  }

  async getSoilParameterById(id: string) {
    const row = this.parameters.get(id);
    return row ? clone(row) : null;
  }

  async getSoilParameterByCode(code: string) {
    const rows = [...this.parameters.values()]
      .filter((r) => r.code === code && r.isActive)
      .sort((a, b) => b.version - a.version);
    return rows[0] ? clone(rows[0]) : null;
  }

  async upsertSoilParameter(row: SoilParameter) {
    this.parameters.set(row.id, clone(row));
    return clone(row);
  }

  async listParameterUnits(parameterId: string, activeOnly = true) {
    return [...this.parameterUnits.values()]
      .filter((r) => r.parameterId === parameterId && (activeOnly ? r.isActive : true))
      .map(clone);
  }

  async upsertParameterUnit(row: SoilParameterUnit) {
    this.parameterUnits.set(row.id, clone(row));
    return clone(row);
  }

  async listParameterAliases(activeOnly = true) {
    return [...this.aliases.values()]
      .filter((r) => (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => b.priority - a.priority || a.alias.localeCompare(b.alias));
  }

  async getParameterAliasById(id: string) {
    const row = this.aliases.get(id);
    return row ? clone(row) : null;
  }

  async upsertParameterAlias(row: SoilParameterAlias) {
    this.aliases.set(row.id, clone(row));
    return clone(row);
  }

  async listParameterOptions(parameterId: string, activeOnly = true) {
    return [...this.options.values()]
      .filter((r) => r.parameterId === parameterId && (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.code.localeCompare(b.code));
  }

  async upsertParameterOption(row: SoilParameterOption) {
    this.options.set(row.id, clone(row));
    return clone(row);
  }

  async listLaboratoryReports(activeOnly = true) {
    return [...this.reports.values()]
      .filter((r) => (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => (b.reportDate ?? b.createdAt).localeCompare(a.reportDate ?? a.createdAt));
  }

  async getLaboratoryReportById(id: string) {
    const row = this.reports.get(id);
    return row ? clone(row) : null;
  }

  async getLaboratoryReportByNumber(laboratoryId: string, reportNumber: string) {
    const rows = [...this.reports.values()]
      .filter(
        (r) =>
          r.laboratoryId === laboratoryId &&
          r.reportNumber === reportNumber &&
          r.isActive,
      )
      .sort((a, b) => b.version - a.version);
    return rows[0] ? clone(rows[0]) : null;
  }

  async getLaboratoryReportByFileHash(fileHash: string) {
    const rows = [...this.reports.values()]
      .filter((r) => r.fileHash === fileHash && r.isActive)
      .sort((a, b) => b.version - a.version);
    return rows[0] ? clone(rows[0]) : null;
  }

  async upsertLaboratoryReport(row: LaboratoryReport) {
    this.reports.set(row.id, clone(row));
    return clone(row);
  }

  async listLaboratoryReportAttachments(reportId: string, activeOnly = true) {
    return [...this.reportAttachments.values()]
      .filter((r) => r.reportId === reportId && (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
  }

  async getLaboratoryReportAttachmentById(id: string) {
    const row = this.reportAttachments.get(id);
    return row ? clone(row) : null;
  }

  async upsertLaboratoryReportAttachment(row: LaboratoryReportAttachment) {
    this.reportAttachments.set(row.id, clone(row));
    return clone(row);
  }

  async listLaboratoryApprovals(reportId: string, activeOnly = true) {
    return [...this.reportApprovals.values()]
      .filter((r) => r.reportId === reportId && (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async upsertLaboratoryApproval(row: LaboratoryApproval) {
    this.reportApprovals.set(row.id, clone(row));
    return clone(row);
  }

  async listLaboratoryImportHistory(reportId: string, activeOnly = true) {
    return [...this.importHistory.values()]
      .filter((r) => r.reportId === reportId && (activeOnly ? r.isActive : true))
      .map(clone)
      .sort((a, b) => a.importedAt.localeCompare(b.importedAt));
  }

  async upsertLaboratoryImportHistory(row: LaboratoryImportHistory) {
    this.importHistory.set(row.id, clone(row));
    return clone(row);
  }

  async getLaboratoryReportAggregate(reportId: string) {
    const report = await this.getLaboratoryReportById(reportId);
    if (!report) return null;
    const [attachments, approvals, importHistory] = await Promise.all([
      this.listLaboratoryReportAttachments(reportId, true),
      this.listLaboratoryApprovals(reportId, true),
      this.listLaboratoryImportHistory(reportId, true),
    ]);
    return {
      reportId,
      report,
      attachments,
      approvals,
      importHistory,
    };
  }

  async listImportSessions() {
    return [...this.importSessions.values()]
      .map(clone)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getImportSessionById(id: string) {
    const row = this.importSessions.get(id);
    return row ? clone(row) : null;
  }

  async getImportSessionByCode(sessionCode: string) {
    const rows = [...this.importSessions.values()]
      .filter((r) => r.sessionCode === sessionCode)
      .sort((a, b) => b.version - a.version);
    return rows[0] ? clone(rows[0]) : null;
  }

  async upsertImportSession(row: ImportSession) {
    this.importSessions.set(row.id, clone(row));
    return clone(row);
  }

  async listImportFiles(sessionId: string) {
    return [...this.importFiles.values()]
      .filter((r) => r.sessionId === sessionId)
      .map(clone)
      .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
  }

  async upsertImportFile(row: ImportFile) {
    this.importFiles.set(row.id, clone(row));
    return clone(row);
  }

  async listImportMappingsByLaboratory(laboratoryId: string) {
    return [...this.importMappings.values()]
      .filter((r) => r.laboratoryId === laboratoryId)
      .map(clone)
      .sort((a, b) => a.externalParameterName.localeCompare(b.externalParameterName));
  }

  async getImportMappingById(id: string) {
    const row = this.importMappings.get(id);
    return row ? clone(row) : null;
  }

  async upsertImportMapping(row: ImportMapping) {
    this.importMappings.set(row.id, clone(row));
    return clone(row);
  }

  async listImportValidations(sessionId: string) {
    return [...this.importValidations.values()]
      .filter((r) => r.sessionId === sessionId)
      .map(clone)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async upsertImportValidation(row: ImportValidation) {
    this.importValidations.set(row.id, clone(row));
    return clone(row);
  }

  async clearImportValidations(sessionId: string) {
    for (const [id, row] of this.importValidations) {
      if (row.sessionId === sessionId) this.importValidations.delete(id);
    }
  }

  async getLaboratoryImportAggregate(sessionId: string) {
    const session = await this.getImportSessionById(sessionId);
    if (!session) return null;
    const [files, mappings, validations] = await Promise.all([
      this.listImportFiles(sessionId),
      this.listImportMappingsByLaboratory(session.laboratoryId),
      this.listImportValidations(sessionId),
    ]);
    return {
      sessionId,
      session,
      files,
      mappings,
      validations,
      pipeline: IMPORT_PIPELINE_STAGES,
    };
  }

  clear() {
    this.laboratories.clear();
    this.methods.clear();
    this.samples.clear();
    this.results.clear();
    this.units.clear();
    this.parameters.clear();
    this.parameterUnits.clear();
    this.aliases.clear();
    this.options.clear();
    this.reports.clear();
    this.reportAttachments.clear();
    this.reportApprovals.clear();
    this.importHistory.clear();
    this.importSessions.clear();
    this.importFiles.clear();
    this.importMappings.clear();
    this.importValidations.clear();
  }
}
