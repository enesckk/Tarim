import { getPool } from '../../database/database-client.js';
import type { FullCropProductionGuide, CropProductionGuide } from '../types/crop-guide.types.js';

export interface CropGuideRepository {
  getGuideByCropCode(cropCode: string): Promise<FullCropProductionGuide | null>;
  getAllGuides(): Promise<CropProductionGuide[]>;
}

export class PostgresCropGuideRepository implements CropGuideRepository {
  async getGuideByCropCode(cropCode: string): Promise<FullCropProductionGuide | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM cpg_crop_production_guides WHERE crop_code = $1 AND is_active = true',
      [cropCode]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    const calendarResult = await pool.query(
      'SELECT * FROM cpg_production_calendars WHERE crop_guide_id = $1 ORDER BY sequence_order ASC',
      [row.id]
    );
    
    const diseasesResult = await pool.query(
      'SELECT * FROM cpg_diseases_pests WHERE crop_guide_id = $1',
      [row.id]
    );

    return {
      id: row.id,
      cropCode: row.crop_code,
      generalInfo: row.general_info,
      expertNotes: row.expert_notes,
      fertilizationReference: row.fertilization_reference,
      irrigationReference: row.irrigation_reference,
      harvestInfo: row.harvest_info,
      sourceType: row.source_type,
      sourceName: row.source_name,
      sourceVersion: row.source_version,
      reviewStatus: row.review_status,
      approvedBy: row.approved_by,
      lastReviewDate: row.last_review_date ? row.last_review_date.toISOString() : null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      calendar: calendarResult.rows.map(c => ({
        id: c.id,
        taskName: c.task_name,
        description: c.description,
        priority: c.priority,
        estimatedTime: c.estimated_time,
        conditions: c.conditions,
        risks: c.risks,
        sequenceOrder: c.sequence_order
      })),
      diseases: diseasesResult.rows.map(d => ({
        id: d.id,
        diseaseName: d.disease_name,
        symptoms: d.symptoms,
        riskPeriod: d.risk_period,
        prevention: d.prevention,
        firstResponse: d.first_response,
        referenceSource: d.reference_source
      }))
    };
  }

  async getAllGuides(): Promise<CropProductionGuide[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM cpg_crop_production_guides WHERE is_active = true ORDER BY crop_code ASC'
    );

    return result.rows.map(row => ({
      id: row.id,
      cropCode: row.crop_code,
      generalInfo: row.general_info,
      expertNotes: row.expert_notes,
      fertilizationReference: row.fertilization_reference,
      irrigationReference: row.irrigation_reference,
      harvestInfo: row.harvest_info,
      sourceType: row.source_type,
      sourceName: row.source_name,
      sourceVersion: row.source_version,
      reviewStatus: row.review_status,
      approvedBy: row.approved_by,
      lastReviewDate: row.last_review_date ? row.last_review_date.toISOString() : null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));
  }
}

export class InMemoryCropGuideRepository implements CropGuideRepository {
  private guides: Map<string, FullCropProductionGuide> = new Map();

  async getGuideByCropCode(cropCode: string): Promise<FullCropProductionGuide | null> {
    return this.guides.get(cropCode) || null;
  }

  async getAllGuides(): Promise<CropProductionGuide[]> {
    return Array.from(this.guides.values());
  }

  // Helper method for tests
  setGuide(cropCode: string, guide: FullCropProductionGuide) {
    this.guides.set(cropCode, guide);
  }
}
