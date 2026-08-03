import type { CropKnowledge, CropSummary } from '../types/crop.types.js';

export interface CropRepository {
  list(): CropKnowledge[];
  listSummaries(): CropSummary[];
  getById(id: string): CropKnowledge | null;
  getKnowledgeBaseVersion(): string;
}
