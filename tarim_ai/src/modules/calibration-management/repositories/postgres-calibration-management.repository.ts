import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { ApiError } from '../../../utils/api-error.js';
import {
  getPool,
  withTransaction,
  type Queryable,
} from '../../database/database-client.js';
import { DatabaseError, mapPgError } from '../../database/errors/database-errors.js';
import type {
  CalibrationAuditEvent,
  CropRequirementProfile,
  ExpertActor,
  ImpactAnalysisSummary,
  ProfileReview,
  ProfileStatus,
  RequirementSource,
} from '../types/calibration-management.types.js';
import type { CalibrationManagementRepository } from './calibration-management.repository.js';

type ProfileRow = {
  id: string;
  crop_id: string;
  version: number;
  status: ProfileStatus;
  base_profile_id: string | null;
  requirements: unknown;
  field_validation_status: CropRequirementProfile['fieldValidationStatus'];
  overall_validation_status: CropRequirementProfile['overallValidationStatus'];
  notes: string[];
  changes: CropRequirementProfile['changes'];
  created_by: ExpertActor;
  approved_at: Date | null;
  published_at: Date | null;
  submitted_at: Date | null;
  impact_analysis: ImpactAnalysisSummary | null;
  bootstrap_key: string | null;
  created_at: Date;
  updated_at: Date;
  row_version: number;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return new Date(value).toISOString();
  return value.toISOString();
}

export class PostgresCalibrationManagementRepository
  implements CalibrationManagementRepository
{
  constructor(private readonly getClient: () => Queryable = () => getPool()) {}

  private db(): Queryable {
    return this.getClient();
  }

  async createProfile(
    profile: CropRequirementProfile,
  ): Promise<CropRequirementProfile> {
    try {
      return await withTransaction(async (client) => {
        await this.insertProfile(client, profile, 1);
        await this.replaceChildren(client, profile);
        const loaded = await this.loadProfile(client, profile.id);
        if (!loaded) throw new ApiError(500, 'Profile create failed to reload');
        return loaded;
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      mapPgError(error);
    }
  }

  async updateProfile(
    profile: CropRequirementProfile,
    options?: { expectedVersion?: number },
  ): Promise<CropRequirementProfile> {
    try {
      return await withTransaction(async (client) => {
        const current = await client.query<{ row_version: number; status: string }>(
          'SELECT row_version, status FROM crop_requirement_profiles WHERE id = $1 FOR UPDATE',
          [profile.id],
        );
        if (current.rowCount === 0) {
          throw new ApiError(404, `Profile not found: ${profile.id}`);
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
          UPDATE crop_requirement_profiles SET
            crop_id = $2,
            version = $3,
            status = $4,
            base_profile_id = $5,
            requirements = $6::jsonb,
            field_validation_status = $7::jsonb,
            overall_validation_status = $8,
            notes = $9::jsonb,
            changes = $10::jsonb,
            created_by = $11::jsonb,
            approved_at = $12::timestamptz,
            published_at = $13::timestamptz,
            submitted_at = $14::timestamptz,
            impact_analysis = $15::jsonb,
            bootstrap_key = $16,
            updated_at = $17::timestamptz,
            row_version = $18,
            superseded_at = CASE WHEN $4 = 'superseded' THEN COALESCE(superseded_at, NOW()) ELSE superseded_at END
          WHERE id = $1 AND row_version = $19
          `,
          [
            profile.id,
            profile.cropId,
            profile.version,
            profile.status,
            profile.baseProfileId,
            JSON.stringify(profile.requirements),
            JSON.stringify(profile.fieldValidationStatus),
            profile.overallValidationStatus,
            JSON.stringify(profile.notes ?? []),
            JSON.stringify(profile.changes ?? []),
            JSON.stringify(profile.createdBy),
            profile.approvedAt ?? null,
            profile.publishedAt ?? null,
            profile.submittedAt ?? null,
            profile.impactAnalysis
              ? JSON.stringify(profile.impactAnalysis)
              : null,
            profile.bootstrapKey ?? null,
            profile.updatedAt,
            nextVersion,
            actualVersion,
          ],
        );
        await this.replaceChildren(client, profile);
        if (profile.impactAnalysis) {
          await this.upsertImpact(client, profile);
        }
        const loaded = await this.loadProfile(client, profile.id);
        if (!loaded) throw new ApiError(500, 'Profile update failed to reload');
        return loaded;
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      mapPgError(error);
    }
  }

  async findProfileById(id: string): Promise<CropRequirementProfile | null> {
    try {
      return await this.loadProfile(this.db(), id);
    } catch (error) {
      mapPgError(error);
    }
  }

  async listProfilesByCropId(cropId: string): Promise<CropRequirementProfile[]> {
    try {
      const result = await this.db().query<{ id: string }>(
        `
        SELECT id FROM crop_requirement_profiles
        WHERE crop_id = $1
        ORDER BY version DESC
        `,
        [cropId],
      );
      const out: CropRequirementProfile[] = [];
      for (const row of result.rows) {
        const profile = await this.loadProfile(this.db(), row.id);
        if (profile) out.push(profile);
      }
      return out;
    } catch (error) {
      mapPgError(error);
    }
  }

  async findActivePublishedByCropId(
    cropId: string,
  ): Promise<CropRequirementProfile | null> {
    try {
      const result = await this.db().query<{ id: string; cnt: string }>(
        `
        SELECT id, COUNT(*) OVER() AS cnt
        FROM crop_requirement_profiles
        WHERE crop_id = $1 AND status = 'published'
        ORDER BY published_at DESC NULLS LAST, version DESC
        `,
        [cropId],
      );
      if (result.rowCount === 0) return null;
      if (Number(result.rows[0]!.cnt) > 1) {
        throw new DatabaseError(
          409,
          'Multiple active published profiles for crop',
          'ACTIVE_PROFILE_CONFLICT',
          { cropId, count: Number(result.rows[0]!.cnt) },
        );
      }
      return this.loadProfile(this.db(), result.rows[0]!.id);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      mapPgError(error);
    }
  }

  async findByBootstrapKey(key: string): Promise<CropRequirementProfile | null> {
    try {
      const result = await this.db().query<{ id: string }>(
        'SELECT id FROM crop_requirement_profiles WHERE bootstrap_key = $1',
        [key],
      );
      if (result.rowCount === 0) return null;
      return this.loadProfile(this.db(), result.rows[0]!.id);
    } catch (error) {
      mapPgError(error);
    }
  }

  async appendAudit(
    event: CalibrationAuditEvent,
  ): Promise<CalibrationAuditEvent> {
    try {
      return await withTransaction(async (client) => {
        // Serialize sequence allocation on the profile row.
        const locked = await client.query(
          'SELECT id FROM crop_requirement_profiles WHERE id = $1 FOR UPDATE',
          [event.profileId],
        );
        if (locked.rowCount === 0) {
          throw new ApiError(404, `Profile not found: ${event.profileId}`);
        }
        const seqResult = await client.query<{ next: string }>(
          `
          SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next
          FROM calibration_audit_events
          WHERE profile_id = $1
          `,
          [event.profileId],
        );
        const sequence = Number(seqResult.rows[0]!.next);
        await client.query(
          `
          INSERT INTO calibration_audit_events (
            id, profile_id, crop_id, event_type, actor,
            previous_status, new_status, changed_paths, reason, metadata,
            created_at, sequence_number
          ) VALUES (
            $1,$2,$3,$4,$5::jsonb,
            $6,$7,$8::jsonb,$9,$10::jsonb,
            $11::timestamptz,$12
          )
          `,
          [
            event.id,
            event.profileId,
            event.cropId,
            event.type,
            JSON.stringify(event.actor),
            event.previousStatus ?? null,
            event.newStatus ?? null,
            JSON.stringify(event.changedPaths ?? []),
            event.reason ?? null,
            JSON.stringify(event.metadata ?? {}),
            event.timestamp,
            sequence,
          ],
        );
        return {
          ...event,
          metadata: {
            ...(event.metadata ?? {}),
            sequenceNumber: sequence,
          },
        };
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      mapPgError(error);
    }
  }

  async listAuditByProfileId(
    profileId: string,
  ): Promise<CalibrationAuditEvent[]> {
    try {
      const result = await this.db().query<{
        id: string;
        profile_id: string;
        crop_id: string;
        event_type: CalibrationAuditEvent['type'];
        actor: ExpertActor;
        previous_status: ProfileStatus | null;
        new_status: ProfileStatus | null;
        changed_paths: string[];
        reason: string | null;
        metadata: Record<string, unknown>;
        created_at: Date;
        sequence_number: string;
      }>(
        `
        SELECT *
        FROM calibration_audit_events
        WHERE profile_id = $1
        ORDER BY sequence_number ASC
        `,
        [profileId],
      );
      return result.rows.map((row) => ({
        id: row.id,
        type: row.event_type,
        timestamp: toIso(row.created_at)!,
        actor: row.actor,
        profileId: row.profile_id,
        cropId: row.crop_id,
        previousStatus: row.previous_status,
        newStatus: row.new_status,
        changedPaths: row.changed_paths ?? [],
        reason: row.reason ?? undefined,
        metadata: {
          ...(row.metadata ?? {}),
          sequenceNumber: Number(row.sequence_number),
        },
      }));
    } catch (error) {
      mapPgError(error);
    }
  }

  /**
   * Atomic publish: supersede previous + publish candidate + publication row + audits.
   */
  async publishAtomic(input: {
    previous: CropRequirementProfile | null;
    next: CropRequirementProfile;
    actor: ExpertActor;
    reason: string;
    audits: CalibrationAuditEvent[];
  }): Promise<CropRequirementProfile> {
    try {
      return await withTransaction(async (client) => {
        if (input.previous && input.previous.id !== input.next.id) {
          await client.query(
            `
            UPDATE crop_requirement_profiles
            SET status = 'superseded',
                superseded_at = NOW(),
                updated_at = NOW(),
                row_version = row_version + 1
            WHERE id = $1 AND status = 'published'
            `,
            [input.previous.id],
          );
        }

        await client.query(
          `
          UPDATE crop_requirement_profiles SET
            status = 'published',
            published_at = $2::timestamptz,
            updated_at = $3::timestamptz,
            row_version = row_version + 1
          WHERE id = $1 AND status = 'approved'
          `,
          [input.next.id, input.next.publishedAt, input.next.updatedAt],
        );

        await client.query(
          `
          INSERT INTO calibration_publications (
            id, profile_id, crop_id, previous_profile_id, publication_type, published_by, created_at
          ) VALUES ($1,$2,$3,$4,'publish',$5::jsonb,NOW())
          `,
          [
            randomUUID(),
            input.next.id,
            input.next.cropId,
            input.previous?.id ?? null,
            JSON.stringify(input.actor),
          ],
        );

        for (const event of input.audits) {
          const seq = await client.query<{ next: string }>(
            `
            SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next
            FROM calibration_audit_events WHERE profile_id = $1
            `,
            [event.profileId],
          );
          await client.query(
            `
            INSERT INTO calibration_audit_events (
              id, profile_id, crop_id, event_type, actor,
              previous_status, new_status, changed_paths, reason, metadata,
              created_at, sequence_number
            ) VALUES (
              $1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9,$10::jsonb,$11::timestamptz,$12
            )
            `,
            [
              event.id,
              event.profileId,
              event.cropId,
              event.type,
              JSON.stringify(event.actor),
              event.previousStatus ?? null,
              event.newStatus ?? null,
              JSON.stringify(event.changedPaths ?? []),
              event.reason ?? input.reason,
              JSON.stringify(event.metadata ?? {}),
              event.timestamp,
              Number(seq.rows[0]!.next),
            ],
          );
        }

        return this.loadProfile(client, input.next.id).then((loaded) => {
          if (!loaded) {
            throw new ApiError(500, 'Published profile failed to reload');
          }
          return loaded;
        });
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      mapPgError(error);
    }
  }

  private async insertProfile(
    client: pg.PoolClient,
    profile: CropRequirementProfile,
    rowVersion: number,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO crop_requirement_profiles (
        id, crop_id, version, status, base_profile_id, requirements,
        field_validation_status, overall_validation_status, notes, changes,
        created_by, approved_at, published_at, submitted_at, impact_analysis,
        bootstrap_key, created_at, updated_at, row_version
      ) VALUES (
        $1,$2,$3,$4,$5,$6::jsonb,
        $7::jsonb,$8,$9::jsonb,$10::jsonb,
        $11::jsonb,$12::timestamptz,$13::timestamptz,$14::timestamptz,$15::jsonb,
        $16,$17::timestamptz,$18::timestamptz,$19
      )
      `,
      [
        profile.id,
        profile.cropId,
        profile.version,
        profile.status,
        profile.baseProfileId,
        JSON.stringify(profile.requirements),
        JSON.stringify(profile.fieldValidationStatus),
        profile.overallValidationStatus,
        JSON.stringify(profile.notes ?? []),
        JSON.stringify(profile.changes ?? []),
        JSON.stringify(profile.createdBy),
        profile.approvedAt ?? null,
        profile.publishedAt ?? null,
        profile.submittedAt ?? null,
        profile.impactAnalysis ? JSON.stringify(profile.impactAnalysis) : null,
        profile.bootstrapKey ?? null,
        profile.createdAt,
        profile.updatedAt,
        rowVersion,
      ],
    );
  }

  private async replaceChildren(
    client: pg.PoolClient,
    profile: CropRequirementProfile,
  ): Promise<void> {
    await client.query('DELETE FROM calibration_sources WHERE profile_id = $1', [
      profile.id,
    ]);
    await client.query('DELETE FROM calibration_reviews WHERE profile_id = $1', [
      profile.id,
    ]);

    for (const source of profile.sources ?? []) {
      await client.query(
        `
        INSERT INTO calibration_sources (
          id, profile_id, type, title, organization, authors, publication_year,
          reference, url, notes, supports, verification_status, created_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11::jsonb,$12,NOW()
        )
        `,
        [
          source.id,
          profile.id,
          source.type,
          source.title,
          source.organization ?? null,
          JSON.stringify(source.authors ?? []),
          source.publicationYear ?? null,
          source.reference ?? null,
          source.url ?? null,
          source.notes ?? null,
          JSON.stringify(source.supports ?? []),
          source.verificationStatus,
        ],
      );
    }

    for (const review of profile.reviews ?? []) {
      await client.query(
        `
        INSERT INTO calibration_reviews (
          id, profile_id, reviewer, decision, reviewed_fields, comments,
          suggested_changes, quality_checks, created_at
        ) VALUES (
          $1,$2,$3::jsonb,$4,$5::jsonb,$6,$7::jsonb,$8::jsonb,$9::timestamptz
        )
        `,
        [
          review.id,
          profile.id,
          JSON.stringify(review.reviewer),
          review.decision,
          JSON.stringify(review.reviewedFields),
          review.comments,
          JSON.stringify(review.suggestedChanges ?? []),
          JSON.stringify(review.qualityChecks ?? []),
          review.createdAt,
        ],
      );
    }
  }

  private async upsertImpact(
    client: pg.PoolClient,
    profile: CropRequirementProfile,
  ): Promise<void> {
    if (!profile.impactAnalysis) return;
    const inputHash = createHash('sha256')
      .update(
        JSON.stringify({
          profileId: profile.id,
          completedAt: profile.impactAnalysis.completedAt,
          summary: profile.impactAnalysis,
        }),
      )
      .digest('hex');
    await client.query(
      `
      INSERT INTO calibration_impact_analyses (
        id, profile_id, baseline_profile_id, input_hash, result,
        score_invariant, rank_invariant, profile_updated_at_snapshot, created_at
      ) VALUES (
        $1,$2,NULL,$3,$4::jsonb,$5,$6,$7::timestamptz,NOW()
      )
      ON CONFLICT (profile_id, input_hash) DO UPDATE SET
        result = EXCLUDED.result,
        score_invariant = EXCLUDED.score_invariant,
        rank_invariant = EXCLUDED.rank_invariant
      `,
      [
        randomUUID(),
        profile.id,
        inputHash,
        JSON.stringify(profile.impactAnalysis),
        profile.impactAnalysis.scoreChangedCount === 0,
        profile.impactAnalysis.rankChangedCount === 0,
        profile.updatedAt,
      ],
    );
  }

  private async loadProfile(
    client: Queryable,
    id: string,
  ): Promise<CropRequirementProfile | null> {
    const result = await client.query<ProfileRow>(
      'SELECT * FROM crop_requirement_profiles WHERE id = $1',
      [id],
    );
    if (result.rowCount === 0) return null;
    const row = result.rows[0]!;

    const sources = await client.query<{
      id: string;
      type: RequirementSource['type'];
      title: string;
      organization: string | null;
      authors: string[];
      publication_year: number | null;
      reference: string | null;
      url: string | null;
      notes: string | null;
      supports: string[];
      verification_status: RequirementSource['verificationStatus'];
    }>(
      `
      SELECT id, type, title, organization, authors, publication_year,
             reference, url, notes, supports, verification_status
      FROM calibration_sources WHERE profile_id = $1
      ORDER BY created_at ASC
      `,
      [id],
    );

    const reviews = await client.query<{
      id: string;
      profile_id: string;
      reviewer: ExpertActor;
      decision: ProfileReview['decision'];
      reviewed_fields: ProfileReview['reviewedFields'];
      comments: string;
      suggested_changes: ProfileReview['suggestedChanges'];
      quality_checks: string[];
      created_at: Date;
    }>(
      `
      SELECT * FROM calibration_reviews
      WHERE profile_id = $1
      ORDER BY created_at ASC
      `,
      [id],
    );

    return {
      id: row.id,
      cropId: row.crop_id,
      version: row.version,
      status: row.status,
      baseProfileId: row.base_profile_id,
      requirements: row.requirements,
      fieldValidationStatus: row.field_validation_status,
      overallValidationStatus: row.overall_validation_status,
      sources: sources.rows.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        organization: s.organization ?? undefined,
        authors: s.authors ?? [],
        publicationYear: s.publication_year,
        reference: s.reference ?? undefined,
        url: s.url,
        notes: s.notes ?? undefined,
        supports: s.supports ?? [],
        verificationStatus: s.verification_status,
      })),
      notes: row.notes ?? [],
      changes: row.changes ?? [],
      reviews: reviews.rows.map((r) => ({
        id: r.id,
        profileId: r.profile_id,
        reviewer: r.reviewer,
        decision: r.decision,
        reviewedFields: r.reviewed_fields,
        comments: r.comments,
        suggestedChanges: r.suggested_changes ?? [],
        qualityChecks: r.quality_checks ?? [],
        createdAt: toIso(r.created_at)!,
      })),
      createdBy: row.created_by,
      createdAt: toIso(row.created_at)!,
      updatedAt: toIso(row.updated_at)!,
      submittedAt: toIso(row.submitted_at),
      approvedAt: toIso(row.approved_at),
      publishedAt: toIso(row.published_at),
      impactAnalysis: row.impact_analysis,
      bootstrapKey: row.bootstrap_key,
      rowVersion: row.row_version,
    } as CropRequirementProfile & { rowVersion: number };
  }
}
