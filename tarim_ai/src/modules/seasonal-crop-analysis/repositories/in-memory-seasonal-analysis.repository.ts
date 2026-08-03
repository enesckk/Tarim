import { ApiError } from '../../../utils/api-error.js';
import {
  cloneSeasonalRecord,
  type SeasonalAnalysisPatch,
  type SeasonalAnalysisRecord,
  type SeasonalAnalysisRepository,
} from './seasonal-analysis.repository.js';

export class InMemorySeasonalAnalysisRepository implements SeasonalAnalysisRepository {
  private readonly byId = new Map<string, SeasonalAnalysisRecord>();

  async create(record: SeasonalAnalysisRecord): Promise<SeasonalAnalysisRecord> {
    if (this.byId.has(record.id)) {
      throw new ApiError(409, `Seasonal analysis already exists: ${record.id}`);
    }
    const stored = cloneSeasonalRecord(record);
    this.byId.set(stored.id, stored);
    return cloneSeasonalRecord(stored);
  }

  async findById(id: string): Promise<SeasonalAnalysisRecord | null> {
    const found = this.byId.get(id);
    return found ? cloneSeasonalRecord(found) : null;
  }

  async update(
    id: string,
    patch: SeasonalAnalysisPatch,
    options?: { expectedVersion?: number },
  ): Promise<SeasonalAnalysisRecord> {
    const current = this.byId.get(id);
    if (!current) {
      throw new ApiError(404, `Seasonal analysis not found: ${id}`);
    }
    if (
      options?.expectedVersion != null &&
      current.version !== options.expectedVersion
    ) {
      throw new ApiError(409, 'Concurrent seasonal analysis update conflict', {
        code: 'CONCURRENT_MODIFICATION',
      });
    }

    const updated: SeasonalAnalysisRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
      version: current.version + 1,
    };
    this.byId.set(id, updated);
    return cloneSeasonalRecord(updated);
  }

  async listByParcelKey(parcelKey: string): Promise<SeasonalAnalysisRecord[]> {
    return [...this.byId.values()]
      .filter((r) => r.parcelKey === parcelKey)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => cloneSeasonalRecord(r));
  }

  clear(): void {
    this.byId.clear();
  }
}
