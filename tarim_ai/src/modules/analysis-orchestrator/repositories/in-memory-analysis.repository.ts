import { ApiError } from '../../../utils/api-error.js';
import type { AnalysisStep } from '../types/analysis.types.js';
import {
  cloneRecord,
  type AnalysisRecord,
  type AnalysisRepository,
  type AnalysisStatusPatch,
  type ProviderSnapshotInput,
} from './analysis.repository.js';

export class InMemoryAnalysisRepository implements AnalysisRepository {
  private readonly byId = new Map<string, AnalysisRecord>();
  private readonly snapshots: ProviderSnapshotInput[] = [];

  async create(record: AnalysisRecord): Promise<AnalysisRecord> {
    if (this.byId.has(record.id)) {
      throw new ApiError(409, `Analysis already exists: ${record.id}`);
    }
    const stored = cloneRecord(record);
    this.byId.set(stored.id, stored);
    return cloneRecord(stored);
  }

  async findById(id: string): Promise<AnalysisRecord | null> {
    const found = this.byId.get(id);
    return found ? cloneRecord(found) : null;
  }

  async update(
    id: string,
    patch: AnalysisStatusPatch,
    options?: { expectedVersion?: number },
  ): Promise<AnalysisRecord> {
    const current = this.byId.get(id);
    if (!current) {
      throw new ApiError(404, `Analysis not found: ${id}`);
    }
    if (
      options?.expectedVersion != null &&
      current.rowVersion !== options.expectedVersion
    ) {
      throw new ApiError(409, 'Concurrent analysis update conflict', {
        code: 'CONCURRENT_MODIFICATION',
      });
    }

    const updated: AnalysisRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
      rowVersion: current.rowVersion + 1,
      steps: current.steps,
    };
    if (patch.result !== undefined) {
      updated.result = patch.result;
    }
    this.byId.set(id, updated);
    return cloneRecord(updated);
  }

  async upsertStep(analysisId: string, step: AnalysisStep): Promise<AnalysisStep> {
    const current = this.byId.get(analysisId);
    if (!current) {
      throw new ApiError(404, `Analysis not found: ${analysisId}`);
    }
    const idx = current.steps.findIndex((s) => s.key === step.key);
    if (idx >= 0) {
      current.steps[idx] = { ...step };
    } else {
      current.steps.push({ ...step });
    }
    current.updatedAt = new Date().toISOString();
    this.byId.set(analysisId, current);
    return { ...step };
  }

  async listSteps(analysisId: string): Promise<AnalysisStep[]> {
    const current = this.byId.get(analysisId);
    if (!current) return [];
    return current.steps.map((s) => ({ ...s }));
  }

  async addProviderSnapshot(input: ProviderSnapshotInput): Promise<void> {
    this.snapshots.push({ ...input });
  }

  async listRecent(limit = 100): Promise<AnalysisRecord[]> {
    return [...this.byId.values()]
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .slice(0, limit)
      .map((r) => cloneRecord(r));
  }

  /** Test helper */
  getSnapshots(): ProviderSnapshotInput[] {
    return [...this.snapshots];
  }

  clear(): void {
    this.byId.clear();
    this.snapshots.length = 0;
  }
}
