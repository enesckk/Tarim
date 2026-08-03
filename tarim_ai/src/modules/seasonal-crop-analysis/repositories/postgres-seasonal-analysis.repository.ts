import { ApiError } from '../../../utils/api-error.js';
import {
  getPool,
  withTransaction,
  type Queryable,
} from '../../database/database-client.js';
import { mapPgError } from '../../database/errors/database-errors.js';
import type {
  SeasonalAnalysisStatus,
  SeasonalCropAnalysisRequest,
  SeasonalCropAnalysisResultData,
  SeasonalStep,
} from '../types/seasonal-crop-analysis.types.js';
import type {
  SeasonalAnalysisPatch,
  SeasonalAnalysisRecord,
  SeasonalAnalysisRepository,
} from './seasonal-analysis.repository.js';

type SeasonalAnalysisRow = {
  id: string;
  parcel_key: string | null;
  parcel_id: string | null;
  request: SeasonalCropAnalysisRequest;
  result: SeasonalCropAnalysisResultData | null;
  status: SeasonalAnalysisStatus;
  progress: number;
  steps: SeasonalStep[];
  engine_version: string;
  calibration_version: string;
  correlation_id: string | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  version: number;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return new Date(value).toISOString();
  return value.toISOString();
}

function mapRow(row: SeasonalAnalysisRow): SeasonalAnalysisRecord {
  return {
    id: row.id,
    parcelKey: row.parcel_key,
    parcelId: row.parcel_id,
    request: row.request,
    result: row.result,
    status: row.status,
    progress: row.progress,
    steps: row.steps ?? [],
    engineVersion: row.engine_version,
    calibrationVersion: row.calibration_version,
    correlationId: row.correlation_id,
    createdAt: toIso(row.created_at)!,
    updatedAt: toIso(row.updated_at)!,
    completedAt: toIso(row.completed_at),
    version: row.version,
  };
}

export class PostgresSeasonalAnalysisRepository implements SeasonalAnalysisRepository {
  constructor(private readonly clientFactory: () => Queryable = () => getPool()) {}

  private db(): Queryable {
    return this.clientFactory();
  }

  async create(record: SeasonalAnalysisRecord): Promise<SeasonalAnalysisRecord> {
    try {
      return await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO seasonal_crop_analyses (
             id, parcel_key, parcel_id, request, result, status, progress, steps,
             engine_version, calibration_version, correlation_id,
             created_at, updated_at, completed_at, version
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,
             $9,$10,$11,
             $12,$13,$14,$15
           )`,
          [
            record.id,
            record.parcelKey,
            record.parcelId,
            JSON.stringify(record.request),
            record.result ? JSON.stringify(record.result) : null,
            record.status,
            record.progress,
            JSON.stringify(record.steps),
            record.engineVersion,
            record.calibrationVersion,
            record.correlationId,
            record.createdAt,
            record.updatedAt,
            record.completedAt,
            record.version,
          ],
        );
        const loaded = await this.load(client, record.id);
        if (!loaded) throw new ApiError(500, 'Seasonal analysis create failed to reload');
        return loaded;
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      mapPgError(error);
    }
  }

  async findById(id: string): Promise<SeasonalAnalysisRecord | null> {
    try {
      return await this.load(this.db(), id);
    } catch (error) {
      mapPgError(error);
    }
  }

  async update(
    id: string,
    patch: SeasonalAnalysisPatch,
    options?: { expectedVersion?: number },
  ): Promise<SeasonalAnalysisRecord> {
    try {
      return await withTransaction(async (client) => {
        const current = await this.load(client, id);
        if (!current) {
          throw new ApiError(404, `Seasonal analysis not found: ${id}`);
        }
        const expected = options?.expectedVersion ?? current.version;
        if (current.version !== expected) {
          throw new ApiError(409, 'Concurrent seasonal analysis update conflict', {
            code: 'CONCURRENT_MODIFICATION',
          });
        }

        const next = {
          parcelKey: patch.parcelKey !== undefined ? patch.parcelKey : current.parcelKey,
          parcelId: patch.parcelId !== undefined ? patch.parcelId : current.parcelId,
          status: patch.status ?? current.status,
          progress: patch.progress ?? current.progress,
          steps: patch.steps ?? current.steps,
          result: patch.result !== undefined ? patch.result : current.result,
          completedAt:
            patch.completedAt !== undefined ? patch.completedAt : current.completedAt,
          version: current.version + 1,
          updatedAt: new Date().toISOString(),
        };

        const result = await client.query(
          `UPDATE seasonal_crop_analyses SET
             parcel_key = $2,
             parcel_id = $3,
             status = $4,
             progress = $5,
             steps = $6,
             result = $7,
             completed_at = $8,
             version = $9,
             updated_at = $10
           WHERE id = $1 AND version = $11
           RETURNING id`,
          [
            id,
            next.parcelKey,
            next.parcelId,
            next.status,
            next.progress,
            JSON.stringify(next.steps),
            next.result ? JSON.stringify(next.result) : null,
            next.completedAt,
            next.version,
            next.updatedAt,
            expected,
          ],
        );

        if (result.rowCount !== 1) {
          throw new ApiError(409, 'Concurrent seasonal analysis update conflict', {
            code: 'CONCURRENT_MODIFICATION',
          });
        }

        const loaded = await this.load(client, id);
        if (!loaded) throw new ApiError(500, 'Seasonal analysis update failed to reload');
        return loaded;
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      mapPgError(error);
    }
  }

  async listByParcelKey(parcelKey: string): Promise<SeasonalAnalysisRecord[]> {
    try {
      const result = await this.db().query<SeasonalAnalysisRow>(
        `SELECT * FROM seasonal_crop_analyses WHERE parcel_key = $1 ORDER BY created_at DESC`,
        [parcelKey],
      );
      return result.rows.map(mapRow);
    } catch (error) {
      mapPgError(error);
      return [];
    }
  }

  private async load(db: Queryable, id: string): Promise<SeasonalAnalysisRecord | null> {
    const result = await db.query<SeasonalAnalysisRow>(
      `SELECT * FROM seasonal_crop_analyses WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]!);
  }
}
