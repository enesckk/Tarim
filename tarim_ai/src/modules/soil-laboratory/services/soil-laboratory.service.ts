import { SoilLaboratoryRepository } from '../repositories/soil-laboratory.repository.js';
import type { SoilAnalysisReport } from '../types/soil-laboratory.types.js';

export class SoilLaboratoryService {
  private readonly repository = new SoilLaboratoryRepository();

  async getLatestApprovedReport(parcelId: string): Promise<SoilAnalysisReport | null> {
    return this.repository.getLatestApprovedByParcel(parcelId);
  }

  async getLatestReport(parcelId: string): Promise<SoilAnalysisReport | null> {
    return this.repository.getLatestByParcel(parcelId);
  }

  // TODO: Add methods for uploading, parsing, and verifying reports
}
