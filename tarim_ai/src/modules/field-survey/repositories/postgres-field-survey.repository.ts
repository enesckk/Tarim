import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { ApiError } from '../../../utils/api-error.js';
import { withTransaction, getPool, type Queryable } from '../../database/database-client.js';
import { DatabaseError, mapPgError } from '../../database/errors/database-errors.js';
import type {
  AuditEvent,
  FieldSurvey,
  SurveySample,
  SurveyStatus,
} from '../types/field-survey.types.js';
import type { FieldSurveyRepository } from './field-survey.repository.js';

type SurveyRow = {
  id: string;
  parcel_id: string;
  parcel_reference: FieldSurvey['parcelReference'];
  survey_date: Date;
  status: SurveyStatus;
  revision_number: number;
  base_survey_id: string | null;
  machine_access: string | null;
  created_by: FieldSurvey['surveyor'];
  reviewer: FieldSurvey['review'] extends infer R
    ? R extends { reviewer: infer Rev }
      ? Rev
      : null
    : null;
  review: FieldSurvey['review'];
  weather_conditions: FieldSurvey['weatherConditions'] | null;
  parcel_observations: FieldSurvey['parcelObservations'];
  photos: FieldSurvey['photos'];
  notes: string[];
  approved_at: Date | null;
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
  row_version: number;
  metadata: Record<string, unknown>;
};

type SampleRow = {
  id: string;
  survey_id: string;
  sequence: number;
  sample_payload: SurveySample;
};

type AuditRow = {
  id: string;
  survey_id: string;
  event_type: string;
  metadata: AuditEvent;
  created_at: Date;
  sequence_number: string | number;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return new Date(value).toISOString();
  return value.toISOString();
}

function mapSample(row: SampleRow): SurveySample {
  return structuredClone(row.sample_payload);
}

function mapAudit(row: AuditRow): AuditEvent {
  const base = row.metadata ?? ({} as AuditEvent);
  return {
    ...base,
    type: row.event_type || base.type,
    timestamp: toIso(row.created_at) ?? base.timestamp,
  };
}

export class PostgresFieldSurveyRepository implements FieldSurveyRepository {
  constructor(private readonly clientFactory: () => Queryable = () => getPool()) {}

  private db(): Queryable {
    return this.clientFactory();
  }

  async create(survey: FieldSurvey): Promise<FieldSurvey> {
    try {
      return await withTransaction(async (client) => {
        await this.insertSurvey(client, survey, 1);
        await this.replaceSamples(client, survey);
        await this.replaceAudit(client, survey);
        const loaded = await this.loadSurvey(client, survey.id);
        if (!loaded) throw new ApiError(500, 'Survey create failed to reload');
        return loaded;
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      mapPgError(error);
    }
  }

  async update(survey: FieldSurvey, options?: { expectedVersion?: number }): Promise<FieldSurvey> {
    try {
      return await withTransaction(async (client) => {
        const current = await client.query<{ row_version: number }>(
          'SELECT row_version FROM field_surveys WHERE id = $1 FOR UPDATE',
          [survey.id],
        );
        if (current.rowCount === 0) {
          throw new ApiError(404, `Survey not found: ${survey.id}`);
        }
        const actualVersion = current.rows[0]!.row_version;
        if (
          options?.expectedVersion != null &&
          options.expectedVersion !== actualVersion
        ) {
          throw new DatabaseError(
            409,
            'Concurrent modification detected',
            'CONCURRENT_MODIFICATION',
            {
              expectedVersion: options.expectedVersion,
              actualVersion,
            },
          );
        }

        const nextVersion = actualVersion + 1;
        await client.query(
          `
          UPDATE field_surveys SET
            parcel_id = $2,
            parcel_reference = $3::jsonb,
            survey_date = $4::timestamptz,
            status = $5,
            revision_number = $6,
            base_survey_id = $7,
            machine_access = $8,
            created_by = $9::jsonb,
            reviewer = $10::jsonb,
            review = $11::jsonb,
            weather_conditions = $12::jsonb,
            parcel_observations = $13::jsonb,
            photos = $14::jsonb,
            notes = $15::jsonb,
            approved_at = $16::timestamptz,
            rejection_reason = $17,
            updated_at = $18::timestamptz,
            row_version = $19,
            metadata = $20::jsonb
          WHERE id = $1 AND row_version = $21
          `,
          [
            survey.id,
            survey.parcelId,
            JSON.stringify(survey.parcelReference),
            survey.surveyDate,
            survey.status,
            survey.revisionNumber,
            survey.previousSurveyId ?? null,
            survey.parcelObservations.machineAccess ?? null,
            JSON.stringify(survey.surveyor),
            survey.review ? JSON.stringify(survey.review.reviewer) : null,
            survey.review ? JSON.stringify(survey.review) : null,
            survey.weatherConditions
              ? JSON.stringify(survey.weatherConditions)
              : null,
            JSON.stringify(survey.parcelObservations ?? {}),
            JSON.stringify(survey.photos ?? []),
            JSON.stringify(survey.notes ?? []),
            survey.approvedAt ?? null,
            survey.rejectionReason ?? null,
            survey.updatedAt,
            nextVersion,
            JSON.stringify({}),
            actualVersion,
          ],
        );

        await this.replaceSamples(client, survey);
        await this.replaceAudit(client, survey);
        const loaded = await this.loadSurvey(client, survey.id);
        if (!loaded) throw new ApiError(500, 'Survey update failed to reload');
        return loaded;
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      mapPgError(error);
    }
  }

  async findById(id: string): Promise<FieldSurvey | null> {
    try {
      return await this.loadSurvey(this.db(), id);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      mapPgError(error);
    }
  }

  async listByParcelId(parcelId: string): Promise<FieldSurvey[]> {
    try {
      const result = await this.db().query<{ id: string }>(
        `
        SELECT id FROM field_surveys
        WHERE parcel_id = $1
        ORDER BY updated_at DESC
        `,
        [parcelId],
      );
      const surveys: FieldSurvey[] = [];
      for (const row of result.rows) {
        const survey = await this.loadSurvey(this.db(), row.id);
        if (survey) surveys.push(survey);
      }
      return surveys;
    } catch (error) {
      mapPgError(error);
    }
  }

  async findLatestApprovedByParcelId(
    parcelId: string,
  ): Promise<FieldSurvey | null> {
    try {
      const result = await this.db().query<{ id: string }>(
        `
        SELECT id
        FROM field_surveys
        WHERE parcel_id = $1
          AND status = 'approved'
        ORDER BY
          COALESCE(approved_at, survey_date) DESC,
          survey_date DESC,
          id DESC
        LIMIT 1
        `,
        [parcelId],
      );
      if (result.rowCount === 0) return null;
      return this.loadSurvey(this.db(), result.rows[0]!.id);
    } catch (error) {
      mapPgError(error);
    }
  }

  private async insertSurvey(
    client: pg.PoolClient,
    survey: FieldSurvey,
    rowVersion: number,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO field_surveys (
        id, parcel_id, parcel_reference, survey_date, status, revision_number,
        base_survey_id, machine_access, created_by, reviewer, review,
        weather_conditions, parcel_observations, photos, notes,
        approved_at, rejection_reason, created_at, updated_at, row_version, metadata
      ) VALUES (
        $1,$2,$3::jsonb,$4::timestamptz,$5,$6,
        $7,$8,$9::jsonb,$10::jsonb,$11::jsonb,
        $12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,
        $16::timestamptz,$17,$18::timestamptz,$19::timestamptz,$20,$21::jsonb
      )
      `,
      [
        survey.id,
        survey.parcelId,
        JSON.stringify(survey.parcelReference),
        survey.surveyDate,
        survey.status,
        survey.revisionNumber,
        survey.previousSurveyId ?? null,
        survey.parcelObservations.machineAccess ?? null,
        JSON.stringify(survey.surveyor),
        survey.review ? JSON.stringify(survey.review.reviewer) : null,
        survey.review ? JSON.stringify(survey.review) : null,
        survey.weatherConditions
          ? JSON.stringify(survey.weatherConditions)
          : null,
        JSON.stringify(survey.parcelObservations ?? {}),
        JSON.stringify(survey.photos ?? []),
        JSON.stringify(survey.notes ?? []),
        survey.approvedAt ?? null,
        survey.rejectionReason ?? null,
        survey.createdAt,
        survey.updatedAt,
        rowVersion,
        JSON.stringify({}),
      ],
    );
  }

  private async replaceSamples(
    client: pg.PoolClient,
    survey: FieldSurvey,
  ): Promise<void> {
    await client.query('DELETE FROM field_survey_samples WHERE survey_id = $1', [
      survey.id,
    ]);
    for (const sample of survey.samples) {
      await client.query(
        `
        INSERT INTO field_survey_samples (
          id, survey_id, sequence, latitude, longitude, accuracy_meters,
          location, measurement_method, rootable_soil_depth_cm, surface_stoniness,
          stoniness_estimated_percent, bedrock_observation, drainage_observation,
          notes, photo_metadata, validation, sample_payload, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,
          $7::jsonb,$8,$9,$10,
          $11,$12,$13,
          $14,$15::jsonb,$16::jsonb,$17::jsonb,NOW(),NOW()
        )
        `,
        [
          sample.id,
          survey.id,
          sample.sequence,
          sample.location.latitude,
          sample.location.longitude,
          sample.location.accuracyMeters ?? null,
          JSON.stringify(sample.location),
          sample.samplingMethod ?? sample.depthMeasurementMethod ?? null,
          sample.rootableSoilDepthCm ?? null,
          sample.surfaceStoniness ?? null,
          sample.estimatedSurfaceStonePercent ?? null,
          sample.bedrockOutcrop ?? null,
          sample.drainageObservation ?? null,
          sample.notes ?? null,
          JSON.stringify([]),
          JSON.stringify({
            acceptance: sample.acceptance,
            acceptanceWarnings: sample.acceptanceWarnings,
            locationConfidence: sample.locationConfidence,
            insideParcel: sample.insideParcel,
            distanceToParcelMeters: sample.distanceToParcelMeters,
          }),
          JSON.stringify(sample),
        ],
      );
    }
  }

  private async replaceAudit(
    client: pg.PoolClient,
    survey: FieldSurvey,
  ): Promise<void> {
    await client.query(
      'DELETE FROM field_survey_audit_events WHERE survey_id = $1',
      [survey.id],
    );
    let seq = 1;
    for (const event of survey.audit.events) {
      await client.query(
        `
        INSERT INTO field_survey_audit_events (
          id, survey_id, event_type, actor, metadata, created_at, sequence_number
        ) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::timestamptz,$7)
        `,
        [
          randomUUID(),
          survey.id,
          event.type,
          JSON.stringify({
            actorId: event.actorId ?? null,
            reviewerId: event.reviewerId ?? null,
          }),
          JSON.stringify(event),
          event.timestamp,
          seq,
        ],
      );
      seq += 1;
    }
  }

  private async loadSurvey(
    client: Queryable,
    id: string,
  ): Promise<FieldSurvey | null> {
    const result = await client.query<SurveyRow>(
      'SELECT * FROM field_surveys WHERE id = $1',
      [id],
    );
    if (result.rowCount === 0) return null;
    const row = result.rows[0]!;

    const samples = await client.query<SampleRow>(
      `
      SELECT id, survey_id, sequence, sample_payload
      FROM field_survey_samples
      WHERE survey_id = $1
      ORDER BY sequence ASC
      `,
      [id],
    );
    const audits = await client.query<AuditRow>(
      `
      SELECT id, survey_id, event_type, metadata, created_at, sequence_number
      FROM field_survey_audit_events
      WHERE survey_id = $1
      ORDER BY sequence_number ASC
      `,
      [id],
    );

    return {
      id: row.id,
      parcelId: row.parcel_id,
      parcelReference: row.parcel_reference,
      status: row.status,
      surveyDate: toIso(row.survey_date)!,
      surveyor: row.created_by,
      weatherConditions: row.weather_conditions ?? undefined,
      samples: samples.rows.map(mapSample),
      parcelObservations: row.parcel_observations ?? {},
      photos: row.photos ?? [],
      notes: row.notes ?? [],
      review: row.review ?? null,
      revisionNumber: row.revision_number,
      previousSurveyId: row.base_survey_id,
      createdAt: toIso(row.created_at)!,
      updatedAt: toIso(row.updated_at)!,
      approvedAt: toIso(row.approved_at),
      rejectionReason: row.rejection_reason,
      audit: { events: audits.rows.map(mapAudit) },
      rowVersion: row.row_version,
    } as FieldSurvey & { rowVersion: number };
  }
}

export function hashRequestPayload(payload: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(payload ?? null))
    .digest('hex');
}
