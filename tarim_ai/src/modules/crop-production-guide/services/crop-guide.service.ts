import type { CropGuideRepository } from '../repositories/crop-guide.repository.js';
import type { FullCropProductionGuide, CropProductionGuide, ProductionCalendarTask } from '../types/crop-guide.types.js';
import { ApiError } from '../../../utils/api-error.js';

export class CropGuideService {
  constructor(private readonly repository: CropGuideRepository) {}

  async getAllGuides(): Promise<CropProductionGuide[]> {
    return this.repository.getAllGuides();
  }

  async getGuideByCropCode(cropCode: string): Promise<FullCropProductionGuide> {
    const guide = await this.repository.getGuideByCropCode(cropCode);
    if (!guide) {
      throw new ApiError(404, `Crop production guide not found for code: ${cropCode}`, {
        code: 'GUIDE_NOT_FOUND',
      });
    }
    return guide;
  }

  async getCalendarByCropCode(cropCode: string): Promise<ProductionCalendarTask[]> {
    const guide = await this.getGuideByCropCode(cropCode);
    return guide.calendar;
  }

  async getTasksByCropCode(cropCode: string): Promise<ProductionCalendarTask[]> {
    // This is essentially the same as calendar but maybe formatted or filtered differently if needed later
    const guide = await this.getGuideByCropCode(cropCode);
    return guide.calendar;
  }
}
