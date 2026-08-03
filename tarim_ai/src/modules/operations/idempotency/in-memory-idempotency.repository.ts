import type {
  IdempotencyRecord,
  IdempotencyRepository,
} from './idempotency.types.js';
import { isExpired } from './idempotency.types.js';

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryIdempotencyRepository implements IdempotencyRepository {
  private readonly records = new Map<string, IdempotencyRecord>();

  private mapKey(operation: string, key: string): string {
    return `${operation}::${key}`;
  }

  async find(operation: string, key: string): Promise<IdempotencyRecord | null> {
    const found = this.records.get(this.mapKey(operation, key));
    return found ? clone(found) : null;
  }

  async createProcessing(input: {
    key: string;
    operation: string;
    requestHash: string;
    expiresAt: string;
    originalCorrelationId?: string | null;
  }): Promise<IdempotencyRecord> {
    const existing = await this.find(input.operation, input.key);
    const reusable =
      !existing ||
      existing.state === 'expired' ||
      existing.state === 'failed' ||
      isExpired(existing);
    if (existing && !reusable) {
      throw Object.assign(new Error('IDEMPOTENCY_CONFLICT'), {
        code: 'IDEMPOTENCY_CONFLICT',
        existing,
      });
    }
    const now = new Date().toISOString();
    const record: IdempotencyRecord = {
      key: input.key,
      operation: input.operation,
      requestHash: input.requestHash,
      state: 'processing',
      resourceId: null,
      responseStatus: null,
      responseBody: null,
      responseHeaders: {},
      errorCode: null,
      lockedAt: now,
      completedAt: null,
      expiresAt: input.expiresAt,
      createdAt: now,
      updatedAt: now,
      originalCorrelationId: input.originalCorrelationId ?? null,
      generation: (existing?.generation ?? 0) + 1,
    };
    this.records.set(this.mapKey(input.operation, input.key), clone(record));
    return clone(record);
  }

  async complete(input: {
    operation: string;
    key: string;
    requestHash: string;
    responseStatus: number;
    responseBody: unknown;
    responseHeaders?: Record<string, string>;
    resourceId?: string | null;
    errorCode?: string | null;
  }): Promise<IdempotencyRecord> {
    const current = await this.find(input.operation, input.key);
    if (!current) {
      throw new Error(`Idempotency record not found: ${input.operation}/${input.key}`);
    }
    const now = new Date().toISOString();
    const updated: IdempotencyRecord = {
      ...current,
      requestHash: input.requestHash,
      state: 'completed',
      responseStatus: input.responseStatus,
      responseBody: structuredClone(input.responseBody),
      responseHeaders: input.responseHeaders ?? {},
      resourceId: input.resourceId ?? current.resourceId,
      errorCode: input.errorCode ?? null,
      completedAt: now,
      updatedAt: now,
      lockedAt: null,
    };
    this.records.set(this.mapKey(input.operation, input.key), clone(updated));
    return clone(updated);
  }

  async markFailed(input: {
    operation: string;
    key: string;
    requestHash: string;
    errorCode?: string | null;
    responseStatus?: number | null;
    responseBody?: unknown | null;
  }): Promise<IdempotencyRecord | null> {
    const current = await this.find(input.operation, input.key);
    if (!current) return null;
    const now = new Date().toISOString();
    const updated: IdempotencyRecord = {
      ...current,
      state: 'failed',
      requestHash: input.requestHash,
      errorCode: input.errorCode ?? null,
      responseStatus: input.responseStatus ?? null,
      responseBody:
        input.responseBody === undefined
          ? current.responseBody
          : structuredClone(input.responseBody),
      updatedAt: now,
      lockedAt: null,
    };
    this.records.set(this.mapKey(input.operation, input.key), clone(updated));
    return clone(updated);
  }

  async deleteExpired(beforeIso: string, limit: number): Promise<number> {
    const cutoff = new Date(beforeIso).getTime();
    let removed = 0;
    for (const [k, record] of this.records) {
      if (removed >= limit) break;
      if (new Date(record.expiresAt).getTime() <= cutoff) {
        this.records.delete(k);
        removed += 1;
      }
    }
    return removed;
  }

  clear(): void {
    this.records.clear();
  }
}
