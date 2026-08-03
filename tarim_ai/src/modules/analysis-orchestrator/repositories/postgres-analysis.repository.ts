import type pg from 'pg';
import { ApiError } from '../../../utils/api-error.js';
import {
  getPool,
  withTransaction,
  type Queryable,
} from '../../database/database-client.js';
import { mapPgError } from '../../database/errors/database-errors.js';
import type {
  AnalysisResultResponse,
  AnalysisStatus,
  AnalysisStep,
  AnalysisStepKey,
  AnalysisStepStatus,
} from '../types/analysis.types.js';
import {
  type AnalysisRecord,
  type AnalysisRepository,
  type AnalysisStatusPatch,
  type ProviderSnapshotInput,
} from './analysis.repository.js';

type AnalysisRow = {
  id: string;
  province: string;
  district: string;
  neighborhood: string;
  block: string;
  parcel: string;
  parcel_id: string | null;
  land_id?: string | null;
  request_options?: unknown;
  status: AnalysisStatus;
  progress: number;
  current_step: string | null;
  result: AnalysisResultResponse | null;
  result_version: number;
  correlation_id: string | null;
  error_code: string | null;
  error_summary: string | null;
  data_mode: 'live' | 'golden';
  created_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  failed_at: Date | null;
  updated_at: Date;
  row_version: number;
};

type StepRow = {
  analysis_id: string;
  step_key: string;
  label: string;
  status: AnalysisStepStatus;
  error_message: string | null;
  duration_ms: number | null;
  started_at: Date | null;
  completed_at: Date | null;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return new Date(value).toISOString();
  return value.toISOString();
}

function mapStep(row: StepRow): AnalysisStep {
  return {
    key: row.step_key as AnalysisStepKey,
    label: row.label,
    status: row.status,
    startedAt: toIso(row.started_at) ?? undefined,
    completedAt: toIso(row.completed_at) ?? undefined,
    error: row.error_message,
    durationMs: row.duration_ms ?? undefined,
  };
}

function mapAnalysis(row: AnalysisRow, steps: AnalysisStep[]): AnalysisRecord {
  return {
    id: row.id,
    province: row.province,
    district: row.district,
    neighborhood: row.neighborhood,
    block: row.block,
    parcel: row.parcel,
    landId: row.land_id ?? null,
    parcelId: row.parcel_id,
    status: row.status,
    progress: row.progress,
    currentStep: (row.current_step as AnalysisStepKey | null) ?? null,
    result: row.result,
    resultVersion: row.result_version,
    correlationId: row.correlation_id,
    errorCode: row.error_code,
    errorSummary: row.error_summary,
    dataMode: row.data_mode,
    createdAt: toIso(row.created_at)!,
    startedAt: toIso(row.started_at),
    completedAt: toIso(row.completed_at),
    failedAt: toIso(row.failed_at),
    updatedAt: toIso(row.updated_at)!,
    rowVersion: row.row_version,
    steps,
    requestOptions:
      row.request_options && typeof row.request_options === 'object'
        ? (row.request_options as AnalysisRecord['requestOptions'])
        : null,
  };
}

export class PostgresAnalysisRepository implements AnalysisRepository {
  constructor(private readonly clientFactory: () => Queryable = () => getPool()) {}

  private db(): Queryable {
    return this.clientFactory();
  }

  async create(record: AnalysisRecord): Promise<AnalysisRecord> {
    try {
      return await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO analyses (
             id, province, district, neighborhood, block, parcel, parcel_id, land_id,
             status, progress, current_step, result, result_version,
             correlation_id, error_code, error_summary, data_mode,
             created_at, started_at, completed_at, failed_at, updated_at, row_version,
             request_options
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,
             $9,$10,$11,$12,$13,
             $14,$15,$16,$17,
             $18,$19,$20,$21,$22,$23,
             $24
           )`,
          [
            record.id,
            record.province,
            record.district,
            record.neighborhood,
            record.block,
            record.parcel,
            record.parcelId,
            record.landId,
            record.status,
            record.progress,
            record.currentStep,
            record.result ? JSON.stringify(record.result) : null,
            record.resultVersion,
            record.correlationId,
            record.errorCode,
            record.errorSummary,
            record.dataMode,
            record.createdAt,
            record.startedAt,
            record.completedAt,
            record.failedAt,
            record.updatedAt,
            record.rowVersion,
            record.requestOptions ? JSON.stringify(record.requestOptions) : null,
          ],
        );

        for (const step of record.steps) {
          await this.insertStep(client, record.id, step);
        }

        const loaded = await this.load(client, record.id);
        if (!loaded) throw new ApiError(500, 'Analysis create failed to reload');
        return loaded;
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      mapPgError(error);
    }
  }

  async findById(id: string): Promise<AnalysisRecord | null> {
    try {
      return await this.load(this.db(), id);
    } catch (error) {
      mapPgError(error);
    }
  }

  async update(
    id: string,
    patch: AnalysisStatusPatch,
    options?: { expectedVersion?: number },
  ): Promise<AnalysisRecord> {
    try {
      return await withTransaction(async (client) => {
        const current = await this.load(client, id);
        if (!current) {
          throw new ApiError(404, `Analysis not found: ${id}`);
        }
        const expected = options?.expectedVersion ?? current.rowVersion;
        if (current.rowVersion !== expected) {
          throw new ApiError(409, 'Concurrent analysis update conflict', {
            code: 'CONCURRENT_MODIFICATION',
          });
        }

        const next = {
          status: patch.status ?? current.status,
          progress: patch.progress ?? current.progress,
          currentStep:
            patch.currentStep !== undefined ? patch.currentStep : current.currentStep,
          parcelId: patch.parcelId !== undefined ? patch.parcelId : current.parcelId,
          errorCode: patch.errorCode !== undefined ? patch.errorCode : current.errorCode,
          errorSummary:
            patch.errorSummary !== undefined ? patch.errorSummary : current.errorSummary,
          startedAt: patch.startedAt !== undefined ? patch.startedAt : current.startedAt,
          completedAt:
            patch.completedAt !== undefined ? patch.completedAt : current.completedAt,
          failedAt: patch.failedAt !== undefined ? patch.failedAt : current.failedAt,
          result: patch.result !== undefined ? patch.result : current.result,
          rowVersion: current.rowVersion + 1,
          updatedAt: new Date().toISOString(),
        };

        const result = await client.query(
          `UPDATE analyses SET
             status = $2,
             progress = $3,
             current_step = $4,
             parcel_id = $5,
             error_code = $6,
             error_summary = $7,
             started_at = $8,
             completed_at = $9,
             failed_at = $10,
             result = $11,
             row_version = $12,
             updated_at = $13
           WHERE id = $1 AND row_version = $14
           RETURNING id`,
          [
            id,
            next.status,
            next.progress,
            next.currentStep,
            next.parcelId,
            next.errorCode,
            next.errorSummary,
            next.startedAt,
            next.completedAt,
            next.failedAt,
            next.result ? JSON.stringify(next.result) : null,
            next.rowVersion,
            next.updatedAt,
            expected,
          ],
        );

        if (result.rowCount !== 1) {
          throw new ApiError(409, 'Concurrent analysis update conflict', {
            code: 'CONCURRENT_MODIFICATION',
          });
        }

        const loaded = await this.load(client, id);
        if (!loaded) throw new ApiError(500, 'Analysis update failed to reload');
        return loaded;
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      mapPgError(error);
    }
  }

  async upsertStep(analysisId: string, step: AnalysisStep): Promise<AnalysisStep> {
    try {
      await this.db().query(
        `INSERT INTO analysis_steps (
           analysis_id, step_key, label, status, error_message, duration_ms, started_at, completed_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (analysis_id, step_key) DO UPDATE SET
           label = EXCLUDED.label,
           status = EXCLUDED.status,
           error_message = EXCLUDED.error_message,
           duration_ms = EXCLUDED.duration_ms,
           started_at = EXCLUDED.started_at,
           completed_at = EXCLUDED.completed_at`,
        [
          analysisId,
          step.key,
          step.label,
          step.status,
          step.error ?? null,
          step.durationMs ?? null,
          step.startedAt ?? null,
          step.completedAt ?? null,
        ],
      );
      return { ...step };
    } catch (error) {
      mapPgError(error);
    }
  }

  async listSteps(analysisId: string): Promise<AnalysisStep[]> {
    try {
      const result = await this.db().query<StepRow>(
        `SELECT * FROM analysis_steps WHERE analysis_id = $1 ORDER BY created_at ASC`,
        [analysisId],
      );
      return result.rows.map(mapStep);
    } catch (error) {
      mapPgError(error);
    }
  }

  async addProviderSnapshot(input: ProviderSnapshotInput): Promise<void> {
    try {
      await this.db().query(
        `INSERT INTO analysis_provider_snapshots (
           analysis_id, provider_name, step_key, request_metadata, response_hash,
           response_summary, source_date, status, cache_key, duration_ms
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          input.analysisId,
          input.providerName,
          input.stepKey,
          input.requestMetadata ? JSON.stringify(input.requestMetadata) : null,
          input.responseHash ?? null,
          input.responseSummary ? JSON.stringify(input.responseSummary) : null,
          input.sourceDate ?? null,
          input.status,
          input.cacheKey ?? null,
          input.durationMs ?? null,
        ],
      );
    } catch (error) {
      mapPgError(error);
    }
  }

  async listRecent(limit = 100): Promise<AnalysisRecord[]> {
    try {
      const result = await this.db().query<AnalysisRow>(
        `SELECT * FROM analyses
         WHERE result IS NOT NULL
         ORDER BY updated_at DESC
         LIMIT $1`,
        [limit],
      );
      const records: AnalysisRecord[] = [];
      for (const row of result.rows) {
        const steps = await this.db().query<StepRow>(
          `SELECT * FROM analysis_steps WHERE analysis_id = $1 ORDER BY created_at ASC`,
          [row.id],
        );
        records.push(mapAnalysis(row, steps.rows.map(mapStep)));
      }
      return records;
    } catch (error) {
      mapPgError(error);
      return [];
    }
  }

  private async insertStep(
    client: pg.PoolClient,
    analysisId: string,
    step: AnalysisStep,
  ): Promise<void> {
    await client.query(
      `INSERT INTO analysis_steps (
         analysis_id, step_key, label, status, error_message, duration_ms, started_at, completed_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        analysisId,
        step.key,
        step.label,
        step.status,
        step.error ?? null,
        step.durationMs ?? null,
        step.startedAt ?? null,
        step.completedAt ?? null,
      ],
    );
  }

  private async load(db: Queryable, id: string): Promise<AnalysisRecord | null> {
    const analysis = await db.query<AnalysisRow>(
      `SELECT * FROM analyses WHERE id = $1`,
      [id],
    );
    if (analysis.rows.length === 0) return null;
    const steps = await db.query<StepRow>(
      `SELECT * FROM analysis_steps WHERE analysis_id = $1 ORDER BY created_at ASC`,
      [id],
    );
    return mapAnalysis(analysis.rows[0]!, steps.rows.map(mapStep));
  }
}
