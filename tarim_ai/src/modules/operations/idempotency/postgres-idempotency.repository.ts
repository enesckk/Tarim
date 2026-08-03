import { getPool, withTransaction, type Queryable } from '../../database/database-client.js';
import { mapPgError } from '../../database/errors/database-errors.js';
import { ApiError } from '../../../utils/api-error.js';
import type {
  IdempotencyRecord,
  IdempotencyRepository,
  IdempotencyState,
} from './idempotency.types.js';

type Row = {
  key: string;
  operation: string;
  request_hash: string;
  state: IdempotencyState;
  resource_id: string | null;
  response_status: number | null;
  response_body: unknown | null;
  response_headers: Record<string, string> | null;
  error_code: string | null;
  locked_at: Date | null;
  completed_at: Date | null;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
  original_correlation_id: string | null;
  generation: number;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return new Date(value).toISOString();
  return value.toISOString();
}

function mapRow(row: Row): IdempotencyRecord {
  return {
    key: row.key,
    operation: row.operation,
    requestHash: row.request_hash,
    state: row.state,
    resourceId: row.resource_id,
    responseStatus: row.response_status,
    responseBody: row.response_body,
    responseHeaders: row.response_headers ?? {},
    errorCode: row.error_code,
    lockedAt: toIso(row.locked_at),
    completedAt: toIso(row.completed_at),
    expiresAt: toIso(row.expires_at)!,
    createdAt: toIso(row.created_at)!,
    updatedAt: toIso(row.updated_at)!,
    originalCorrelationId: row.original_correlation_id,
    generation: row.generation,
  };
}

export class PostgresIdempotencyRepository implements IdempotencyRepository {
  constructor(private readonly getClient: () => Queryable = () => getPool()) {}

  async find(operation: string, key: string): Promise<IdempotencyRecord | null> {
    try {
      const result = await this.getClient().query<Row>(
        `
        SELECT * FROM idempotency_records
        WHERE operation = $1 AND key = $2
        `,
        [operation, key],
      );
      if (result.rowCount === 0) return null;
      return mapRow(result.rows[0]!);
    } catch (error) {
      mapPgError(error);
    }
  }

  async createProcessing(input: {
    key: string;
    operation: string;
    requestHash: string;
    expiresAt: string;
    originalCorrelationId?: string | null;
  }): Promise<IdempotencyRecord> {
    try {
      return await withTransaction(async (client) => {
        await client.query(
          `SELECT pg_advisory_xact_lock(hashtext($1::text), hashtext($2::text))`,
          [input.operation, input.key],
        );
        const existing = await client.query<Row>(
          `
          SELECT * FROM idempotency_records
          WHERE operation = $1 AND key = $2
          FOR UPDATE
          `,
          [input.operation, input.key],
        );
        if (existing.rowCount && existing.rows[0]) {
          const row = existing.rows[0];
          const expired = new Date(row.expires_at).getTime() <= Date.now();
          const reusable =
            row.state === 'failed' || row.state === 'expired' || expired;
          if (reusable) {
            const updated = await client.query<Row>(
              `
              UPDATE idempotency_records SET
                request_hash = $3,
                state = 'processing',
                response_status = NULL,
                response_body = NULL,
                response_headers = '{}'::jsonb,
                resource_id = NULL,
                error_code = NULL,
                locked_at = NOW(),
                completed_at = NULL,
                expires_at = $4::timestamptz,
                updated_at = NOW(),
                original_correlation_id = $5,
                generation = generation + 1
              WHERE operation = $1 AND key = $2
              RETURNING *
              `,
              [
                input.operation,
                input.key,
                input.requestHash,
                input.expiresAt,
                input.originalCorrelationId ?? null,
              ],
            );
            return mapRow(updated.rows[0]!);
          }
          throw Object.assign(new Error('IDEMPOTENCY_CONFLICT'), {
            code: 'IDEMPOTENCY_CONFLICT',
            existing: mapRow(row),
          });
        }

        try {
          const inserted = await client.query<Row>(
            `
            INSERT INTO idempotency_records (
              key, operation, request_hash, state, locked_at, expires_at,
              created_at, updated_at, original_correlation_id, generation,
              response_headers
            ) VALUES (
              $1,$2,$3,'processing',NOW(),$4::timestamptz,NOW(),NOW(),$5,1,'{}'::jsonb
            )
            RETURNING *
            `,
            [
              input.key,
              input.operation,
              input.requestHash,
              input.expiresAt,
              input.originalCorrelationId ?? null,
            ],
          );
          return mapRow(inserted.rows[0]!);
        } catch (insertError) {
          const pgCode = (insertError as { code?: string })?.code;
          if (pgCode === '23505') {
            const raced = await client.query<Row>(
              `
              SELECT * FROM idempotency_records
              WHERE operation = $1 AND key = $2
              FOR UPDATE
              `,
              [input.operation, input.key],
            );
            if (raced.rows[0]) {
              throw Object.assign(new Error('IDEMPOTENCY_CONFLICT'), {
                code: 'IDEMPOTENCY_CONFLICT',
                existing: mapRow(raced.rows[0]),
              });
            }
          }
          throw insertError;
        }
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'IDEMPOTENCY_CONFLICT') throw error;
      if (error instanceof ApiError) throw error;
      mapPgError(error);
    }
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
    try {
      const result = await this.getClient().query<Row>(
        `
        UPDATE idempotency_records SET
          request_hash = $3,
          state = 'completed',
          response_status = $4,
          response_body = $5::jsonb,
          response_headers = $6::jsonb,
          resource_id = COALESCE(
            CASE
              WHEN $7::text IS NULL OR $7::text = '' THEN NULL
              WHEN $7::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                THEN $7::uuid
              ELSE NULL
            END,
            resource_id
          ),
          error_code = $8,
          completed_at = NOW(),
          updated_at = NOW(),
          locked_at = NULL
        WHERE operation = $1 AND key = $2
        RETURNING *
        `,
        [
          input.operation,
          input.key,
          input.requestHash,
          input.responseStatus,
          JSON.stringify(input.responseBody ?? null),
          JSON.stringify(input.responseHeaders ?? {}),
          input.resourceId ?? null,
          input.errorCode ?? null,
        ],
      );
      if (result.rowCount === 0) {
        throw new ApiError(404, 'Idempotency record not found');
      }
      return mapRow(result.rows[0]!);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      mapPgError(error);
    }
  }

  async markFailed(input: {
    operation: string;
    key: string;
    requestHash: string;
    errorCode?: string | null;
    responseStatus?: number | null;
    responseBody?: unknown | null;
  }): Promise<IdempotencyRecord | null> {
    try {
      const result = await this.getClient().query<Row>(
        `
        UPDATE idempotency_records SET
          request_hash = $3,
          state = 'failed',
          error_code = $4,
          response_status = $5,
          response_body = COALESCE($6::jsonb, response_body),
          updated_at = NOW(),
          locked_at = NULL
        WHERE operation = $1 AND key = $2
        RETURNING *
        `,
        [
          input.operation,
          input.key,
          input.requestHash,
          input.errorCode ?? null,
          input.responseStatus ?? null,
          input.responseBody === undefined
            ? null
            : JSON.stringify(input.responseBody),
        ],
      );
      if (result.rowCount === 0) return null;
      return mapRow(result.rows[0]!);
    } catch (error) {
      mapPgError(error);
    }
  }

  async deleteExpired(beforeIso: string, limit: number): Promise<number> {
    try {
      const result = await this.getClient().query(
        `
        DELETE FROM idempotency_records
        WHERE ctid IN (
          SELECT ctid FROM idempotency_records
          WHERE expires_at <= $1::timestamptz
          ORDER BY expires_at ASC
          LIMIT $2
        )
        `,
        [beforeIso, limit],
      );
      return result.rowCount ?? 0;
    } catch (error) {
      mapPgError(error);
    }
  }
}
