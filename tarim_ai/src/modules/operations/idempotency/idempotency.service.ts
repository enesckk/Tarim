import type { IdempotencyRecord, IdempotencyRepository } from './idempotency.types.js';
import { isExpired } from './idempotency.types.js';

export type IdempotencyBeginResult =
  | { action: 'proceed'; record: IdempotencyRecord }
  | { action: 'replay'; record: IdempotencyRecord }
  | {
      action: 'conflict';
      code:
        | 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD'
        | 'IDEMPOTENCY_REQUEST_IN_PROGRESS'
        | 'IDEMPOTENCY_RECORD_CORRUPTED';
      statusCode: number;
      message: string;
      record?: IdempotencyRecord;
      retryAfterSeconds?: number;
    };

export interface IdempotencyPolicy {
  ttlSeconds: number;
  replayClientErrors: boolean;
  inProgressStatusCode: 409 | 425;
  requiredForCriticalWrites: boolean;
}

export class IdempotencyService {
  constructor(
    private readonly repository: IdempotencyRepository,
    private readonly policy: IdempotencyPolicy,
  ) {}

  getPolicy(): IdempotencyPolicy {
    return this.policy;
  }

  getRepository(): IdempotencyRepository {
    return this.repository;
  }

  async begin(input: {
    operation: string;
    key: string;
    requestHash: string;
    correlationId?: string | null;
  }): Promise<IdempotencyBeginResult> {
    const existing = await this.repository.find(input.operation, input.key);

    if (existing && isExpired(existing)) {
      // Allow reuse by creating a new generation below.
    } else if (existing) {
      if (existing.requestHash !== input.requestHash) {
        return {
          action: 'conflict',
          code: 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
          statusCode: 409,
          message:
            'Idempotency-Key was reused with a different request payload',
          record: existing,
        };
      }

      if (existing.state === 'completed') {
        if (
          existing.responseStatus == null ||
          existing.responseBody === undefined
        ) {
          return {
            action: 'conflict',
            code: 'IDEMPOTENCY_RECORD_CORRUPTED',
            statusCode: 500,
            message: 'Completed idempotency record is missing response data',
            record: existing,
          };
        }
        return { action: 'replay', record: existing };
      }

      if (existing.state === 'processing') {
        return {
          action: 'conflict',
          code: 'IDEMPOTENCY_REQUEST_IN_PROGRESS',
          statusCode: this.policy.inProgressStatusCode,
          message: 'A request with this Idempotency-Key is already in progress',
          record: existing,
          retryAfterSeconds: 1,
        };
      }

      if (existing.state === 'failed') {
        // Allow retry by replacing the failed record.
      }
    }

    try {
      const expiresAt = new Date(
        Date.now() + this.policy.ttlSeconds * 1000,
      ).toISOString();
      const record = await this.repository.createProcessing({
        key: input.key,
        operation: input.operation,
        requestHash: input.requestHash,
        expiresAt,
        originalCorrelationId: input.correlationId ?? null,
      });
      return { action: 'proceed', record };
    } catch (error) {
      const conflict = error as {
        code?: string;
        existing?: IdempotencyRecord;
      };
      if (conflict.code === 'IDEMPOTENCY_CONFLICT' && conflict.existing) {
        const again = conflict.existing;
        if (again.requestHash !== input.requestHash) {
          return {
            action: 'conflict',
            code: 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
            statusCode: 409,
            message:
              'Idempotency-Key was reused with a different request payload',
            record: again,
          };
        }
        if (again.state === 'completed') {
          return { action: 'replay', record: again };
        }
        return {
          action: 'conflict',
          code: 'IDEMPOTENCY_REQUEST_IN_PROGRESS',
          statusCode: this.policy.inProgressStatusCode,
          message: 'A request with this Idempotency-Key is already in progress',
          record: again,
          retryAfterSeconds: 1,
        };
      }
      // Unique race: re-read and classify.
      const raced = await this.repository.find(input.operation, input.key);
      if (raced) {
        if (raced.requestHash !== input.requestHash) {
          return {
            action: 'conflict',
            code: 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
            statusCode: 409,
            message:
              'Idempotency-Key was reused with a different request payload',
            record: raced,
          };
        }
        if (raced.state === 'completed') {
          return { action: 'replay', record: raced };
        }
        return {
          action: 'conflict',
          code: 'IDEMPOTENCY_REQUEST_IN_PROGRESS',
          statusCode: this.policy.inProgressStatusCode,
          message: 'A request with this Idempotency-Key is already in progress',
          record: raced,
          retryAfterSeconds: 1,
        };
      }
      throw error;
    }
  }

  shouldPersistResponse(statusCode: number): 'complete' | 'fail' | 'ignore' {
    if (statusCode >= 200 && statusCode < 300) return 'complete';
    if (statusCode >= 400 && statusCode < 500) {
      // Do not persist in-progress / conflict responses from idempotency itself
      // as completed business outcomes when they are our own control-plane codes.
      if (statusCode === 409 || statusCode === 425) {
        // Could be business 409; still complete if replayClientErrors so retries
        // return the same business conflict. Control-plane responses set skipFinalize.
        return this.policy.replayClientErrors ? 'complete' : 'fail';
      }
      return this.policy.replayClientErrors ? 'complete' : 'fail';
    }
    if (statusCode >= 500) return 'fail';
    return 'ignore';
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
    return this.repository.complete(input);
  }

  async markFailed(input: {
    operation: string;
    key: string;
    requestHash: string;
    errorCode?: string | null;
    responseStatus?: number | null;
    responseBody?: unknown | null;
  }): Promise<IdempotencyRecord | null> {
    return this.repository.markFailed(input);
  }

  async cleanupExpired(batchSize: number): Promise<number> {
    return this.repository.deleteExpired(new Date().toISOString(), batchSize);
  }
}
