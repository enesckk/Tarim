import { Pool } from 'pg';
import { getPool } from '../../database/index.js';
import type { 
  WmWaterSource, 
  WmWaterQuantity, 
  WmLaboratoryReport, 
  WmAnalysisResult,
  WmWaterSourceAggregate
} from '../types/water-management.types.js';

export class WaterManagementRepository {
  private readonly pool: Pool = getPool();

  async getSourcesByParcel(parcelId: string): Promise<WmWaterSourceAggregate[]> {
    const res = await this.pool.query(`
      SELECT * FROM wm_water_sources
      WHERE parcel_id = $1 AND active = true
      ORDER BY created_at ASC
    `, [parcelId]);

    const sources: WmWaterSourceAggregate[] = res.rows.map(this.mapSource);

    for (const source of sources) {
      source.quantity = await this.getLatestQuantity(source.id);
      source.latestReport = await this.getLatestReport(source.id);
    }

    return sources;
  }

  private async getLatestQuantity(sourceId: string): Promise<WmWaterQuantity | undefined> {
    const res = await this.pool.query(`
      SELECT * FROM wm_water_quantity
      WHERE source_id = $1
      ORDER BY measurement_date DESC NULLS LAST, created_at DESC
      LIMIT 1
    `, [sourceId]);

    if (res.rows.length === 0) return undefined;
    const row = res.rows[0];
    return {
      id: row.id as string,
      sourceId: row.source_id as string,
      estimatedFlow: row.estimated_flow as number | null,
      measuredFlow: row.measured_flow as number | null,
      dailyCapacity: row.daily_capacity as number | null,
      seasonalCapacity: row.seasonal_capacity as number | null,
      reliability: row.reliability as string | null,
      measurementDate: row.measurement_date as string | null,
      measurementSource: row.measurement_source as string | null,
      createdAt: row.created_at as string,
    };
  }

  private async getLatestReport(sourceId: string): Promise<WmLaboratoryReport | undefined> {
    const res = await this.pool.query(`
      SELECT * FROM wm_laboratory_reports
      WHERE source_id = $1
      ORDER BY analysis_date DESC NULLS LAST, created_at DESC
      LIMIT 1
    `, [sourceId]);

    if (res.rows.length === 0) return undefined;
    
    const row = res.rows[0];
    const report: WmLaboratoryReport = {
      id: row.id as string,
      sourceId: row.source_id as string,
      status: row.status as any,
      analysisDate: row.analysis_date as string | null,
      samplingDate: row.sampling_date as string | null,
      reportNumber: row.report_number as string | null,
      analyst: row.analyst as string | null,
      notes: row.notes as string | null,
      version: row.version as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };

    report.results = await this.getAnalysisResults(report.id);
    return report;
  }

  private async getAnalysisResults(reportId: string): Promise<WmAnalysisResult[]> {
    const res = await this.pool.query(`
      SELECT * FROM wm_analysis_results
      WHERE report_id = $1
    `, [reportId]);
    
    return res.rows.map(row => ({
      id: row.id as string,
      reportId: row.report_id as string,
      parameterName: row.parameter_name as string,
      value: row.value as number,
      unit: row.unit as string | null,
      sourceUnit: row.source_unit as string | null,
      createdAt: row.created_at as string,
    }));
  }

  private mapSource(row: Record<string, any>): WmWaterSource {
    return {
      id: row.id as string,
      parcelId: row.parcel_id as string,
      name: row.name as string,
      sourceType: row.source_type as any,
      active: row.active as boolean,
      owner: row.owner as string | null,
      shared: row.shared as boolean,
      distanceToParcel: row.distance_to_parcel as number | null,
      available: row.available as boolean,
      seasonal: row.seasonal as boolean,
      estimatedCapacity: row.estimated_capacity as number | null,
      flowRate: row.flow_rate as number | null,
      pumpAvailable: row.pump_available as boolean,
      electricityAvailable: row.electricity_available as boolean,
      licenseNumber: row.license_number as string | null,
      notes: row.notes as string | null,
      dataConfidence: row.data_confidence as string | null,
      sourceQuality: row.source_quality as string | null,
      reviewStatus: row.review_status as string | null,
      approvalStatus: row.approval_status as string | null,
      version: row.version as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
