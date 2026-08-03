import type { CropRepository } from '../repositories/crop-repository.interface.js';
import type { CropKnowledge, CropSummary } from '../types/crop.types.js';
import { ApiError } from '../../../utils/api-error.js';

export class CropKnowledgeService {
  constructor(private readonly repository: CropRepository) {}

  listSummaries(): { count: number; crops: CropSummary[] } {
    const crops = this.repository.listSummaries();
    return { count: crops.length, crops };
  }

  getById(cropId: string): CropKnowledge {
    const crop = this.repository.getById(cropId);
    if (!crop) {
      throw new ApiError(404, `Crop not found: ${cropId}`);
    }
    return crop;
  }

  listAll(): CropKnowledge[] {
    return this.repository.list();
  }

  getKnowledgeBaseVersion(): string {
    return this.repository.getKnowledgeBaseVersion();
  }
}
