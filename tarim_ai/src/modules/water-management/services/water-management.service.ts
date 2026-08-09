import { WaterManagementRepository } from '../repositories/water-management.repository.js';
import type { WmWaterSourceAggregate } from '../types/water-management.types.js';

export class WaterManagementService {
  private readonly repository = new WaterManagementRepository();

  async getSourcesByParcel(parcelId: string): Promise<WmWaterSourceAggregate[]> {
    return this.repository.getSourcesByParcel(parcelId);
  }

  // TODO: Add methods for uploading, parsing, and verifying water laboratory reports
}
