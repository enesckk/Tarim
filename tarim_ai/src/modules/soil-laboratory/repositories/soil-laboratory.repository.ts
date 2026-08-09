import { Pool } from 'pg';
import { getPool } from '../../database/index.js';
import type { SoilAnalysisReport, SoilAnalysisResult, SoilQualityControl } from '../types/soil-laboratory.types.js';

export class SoilLaboratoryRepository {
  private readonly pool: Pool = getPool();

  async getLatestApprovedByParcel(parcelId: string): Promise<SoilAnalysisReport | null> {
    const res = await this.pool.query(`
      SELECT * FROM sl_analysis_reports
      WHERE parcel_id = $1 AND status = 'Approved'
      ORDER BY analysis_date DESC NULLS LAST, created_at DESC
      LIMIT 1
    `, [parcelId]);

    if (res.rows.length === 0) return null;
    return this.mapReport(res.rows[0]);
  }

  async getLatestByParcel(parcelId: string): Promise<SoilAnalysisReport | null> {
    const res = await this.pool.query(`
      SELECT * FROM sl_analysis_reports
      WHERE parcel_id = $1
      ORDER BY analysis_date DESC NULLS LAST, created_at DESC
      LIMIT 1
    `, [parcelId]);

    if (res.rows.length === 0) return null;
    const report = this.mapReport(res.rows[0]);
    
    // Fetch results and quality control
    report.results = await this.getResults(report.id);
    report.qualityControl = await this.getQualityControl(report.id) ?? undefined;
    
    return report;
  }

  async getResults(reportId: string): Promise<SoilAnalysisResult[]> {
    const res = await this.pool.query(`
      SELECT * FROM sl_analysis_results
      WHERE report_id = $1
    `, [reportId]);
    return res.rows.map(row => ({
      id: row.id,
      reportId: row.report_id,
      parameterName: row.parameter_name,
      value: row.value,
      unit: row.unit,
      sourceUnit: row.source_unit,
      createdAt: row.created_at,
    }));
  }

  async getQualityControl(reportId: string): Promise<SoilQualityControl | null> {
    const res = await this.pool.query(`
      SELECT * FROM sl_quality_control
      WHERE report_id = $1
    `, [reportId]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      reportId: row.report_id,
      completeness: row.completeness,
      missingFields: row.missing_fields || [],
      suspiciousValues: row.suspicious_values || [],
      duplicateReport: row.duplicate_report,
      createdAt: row.created_at,
    };
  }

  private mapReport(row: Record<string, any>): SoilAnalysisReport {
    return {
      id: row.id as string,
      parcelId: row.parcel_id as string,
      status: row.status as any,
      sampleNumber: row.sample_number as string,
      labName: row.lab_name as string,
      labAccreditation: row.lab_accreditation as string,
      analysisDate: row.analysis_date as string,
      samplingDate: row.sampling_date as string,
      sampleDepth: row.sample_depth as string,
      sampleLocation: row.sample_location as string,
      reportNumber: row.report_number as string,
      analyst: row.analyst as string,
      notes: row.notes as string,
      version: row.version as number,
      reviewStatus: row.review_status as string,
      approvalStatus: row.approval_status as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
