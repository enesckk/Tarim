import { createHash, randomUUID } from 'node:crypto';
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { resetEnvCache } from '../../../config/env.js';
import {
  closePool,
  resetDatabaseClient,
  withTransaction,
  checkConnectivity,
} from '../database-client.js';
import { migrateUp, listMigrationFiles } from '../migrations/runner.js';
import { PostgresFieldSurveyRepository } from '../../field-survey/repositories/postgres-field-survey.repository.js';
import { PostgresCalibrationManagementRepository } from '../../calibration-management/repositories/postgres-calibration-management.repository.js';
import { CropKnowledgeService } from '../../crop-recommendation/services/crop-knowledge.service.js';
import { getSharedCropRepository } from '../../crop-recommendation/repositories/json-crop.repository.js';
import { CalibrationManagementService } from '../../calibration-management/services/calibration-management.service.js';
import { DatabaseHealthService } from '../database-health.service.js';
import type { FieldSurvey } from '../../field-survey/types/field-survey.types.js';
import type { ExpertActor } from '../../calibration-management/types/calibration-management.types.js';
import { resetSharedCalibrationRepository } from '../../crop-recommendation/calibration/calibration-profile.repository.js';

const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://tarim:tarim@localhost:5433/tarim_ai';

function enablePgEnv() {
  process.env.COPERNICUS_CLIENT_ID = process.env.COPERNICUS_CLIENT_ID || 'test-id';
  process.env.COPERNICUS_CLIENT_SECRET =
    process.env.COPERNICUS_CLIENT_SECRET || 'test-secret';
  process.env.DATABASE_ENABLED = 'true';
  process.env.PERSISTENCE_PROVIDER = 'postgresql';
  process.env.DATABASE_URL = databaseUrl;
  process.env.DATABASE_AUTO_MIGRATE = 'false';
  process.env.CALIBRATION_MANAGEMENT_ENABLED = 'true';
  resetEnvCache();
  resetSharedCalibrationRepository();
}

async function canConnect(): Promise<boolean> {
  enablePgEnv();
  await resetDatabaseClient();
  try {
    const result = await checkConnectivity();
    return result.connected;
  } catch {
    return false;
  }
}

describe('database migrations (unit)', () => {
  it('lists deterministic forward migrations', () => {
    const files = listMigrationFiles();
    expect(files.length).toBeGreaterThanOrEqual(10);
    expect(files[0]?.id.startsWith('001')).toBe(true);
    const ids = files.map((f) => f.id);
    expect([...ids].sort()).toEqual(ids);
  });

  it('hashes payloads stably for idempotency', () => {
    const a = createHash('sha256').update(JSON.stringify({ x: 1 })).digest('hex');
    const b = createHash('sha256').update(JSON.stringify({ x: 1 })).digest('hex');
    expect(a).toBe(b);
  });
});

describe('postgresql persistence integration', () => {
  let connected = false;

  beforeAll(async () => {
    connected = await canConnect();
    if (!connected) return;
    await migrateUp();
  });

  afterAll(async () => {
    await closePool();
    resetEnvCache();
  });

  beforeEach(async ({ skip }) => {
    if (!connected) skip();
    enablePgEnv();
    await resetDatabaseClient();
    await withTransaction(async (client) => {
      await client.query('TRUNCATE idempotency_records CASCADE');
      await client.query('TRUNCATE calibration_audit_events CASCADE');
      await client.query('TRUNCATE calibration_publications CASCADE');
      await client.query('TRUNCATE calibration_impact_analyses CASCADE');
      await client.query('TRUNCATE calibration_reviews CASCADE');
      await client.query('TRUNCATE calibration_sources CASCADE');
      await client.query('TRUNCATE crop_requirement_profiles CASCADE');
      await client.query('TRUNCATE field_survey_audit_events CASCADE');
      await client.query('TRUNCATE field_survey_samples CASCADE');
      await client.query('TRUNCATE field_surveys CASCADE');
    });
  });

  it('reports healthy database status', async ({ skip }) => {
    if (!connected) skip();
    const health = await new DatabaseHealthService().getStatus();
    expect(health.provider).toBe('postgresql');
    expect(health.connected).toBe(true);
    expect(health.migrationStatus).toBe('up_to_date');
    expect(typeof health.latencyMs).toBe('number');
  });

  it('persists field survey across repository restart', async ({ skip }) => {
    if (!connected) skip();
    const repo1 = new PostgresFieldSurveyRepository();
    const surveyId = randomUUID();
    const now = new Date().toISOString();
    const survey: FieldSurvey = {
      id: surveyId,
      parcelId: 'gaziantep|şehitkamil|güngürge|108|7',
      parcelReference: {
        province: 'Gaziantep',
        district: 'Şehitkamil',
        neighborhood: 'Güngürge',
        block: '108',
        parcel: '7',
      },
      status: 'approved',
      surveyDate: now,
      surveyor: { id: 's1', name: 'Surveyor' },
      samples: [
        {
          id: randomUUID(),
          sequence: 1,
          location: { latitude: 37.2, longitude: 37.4, accuracyMeters: 5 },
          insideParcel: true,
          distanceToParcelMeters: 0,
          locationConfidence: 'high',
          acceptance: 'accepted',
          acceptanceWarnings: [],
          rootableSoilDepthCm: 28,
          surfaceStoniness: 'medium',
          bedrockOutcrop: 'not_observed',
          drainageObservation: 'adequate',
        },
        {
          id: randomUUID(),
          sequence: 2,
          location: { latitude: 37.2001, longitude: 37.4001, accuracyMeters: 5 },
          insideParcel: true,
          distanceToParcelMeters: 0,
          locationConfidence: 'high',
          acceptance: 'accepted',
          acceptanceWarnings: [],
          rootableSoilDepthCm: 31,
          surfaceStoniness: 'medium',
          bedrockOutcrop: 'not_observed',
          drainageObservation: 'adequate',
        },
        {
          id: randomUUID(),
          sequence: 3,
          location: { latitude: 37.2002, longitude: 37.4002, accuracyMeters: 5 },
          insideParcel: true,
          distanceToParcelMeters: 0,
          locationConfidence: 'high',
          acceptance: 'accepted',
          acceptanceWarnings: [],
          rootableSoilDepthCm: 35,
          surfaceStoniness: 'medium',
          bedrockOutcrop: 'not_observed',
          drainageObservation: 'adequate',
        },
        {
          id: randomUUID(),
          sequence: 4,
          location: { latitude: 37.2003, longitude: 37.4003, accuracyMeters: 5 },
          insideParcel: true,
          distanceToParcelMeters: 0,
          locationConfidence: 'high',
          acceptance: 'accepted',
          acceptanceWarnings: [],
          rootableSoilDepthCm: 37,
          surfaceStoniness: 'medium',
          bedrockOutcrop: 'not_observed',
          drainageObservation: 'adequate',
        },
        {
          id: randomUUID(),
          sequence: 5,
          location: { latitude: 37.2004, longitude: 37.4004, accuracyMeters: 5 },
          insideParcel: true,
          distanceToParcelMeters: 0,
          locationConfidence: 'high',
          acceptance: 'accepted',
          acceptanceWarnings: [],
          rootableSoilDepthCm: 40,
          surfaceStoniness: 'medium',
          bedrockOutcrop: 'not_observed',
          drainageObservation: 'adequate',
        },
      ],
      parcelObservations: {
        machineAccess: 'verified_accessible',
        drainageObservation: 'adequate',
        surfaceStoniness: 'medium',
        bedrockOutcrop: 'not_observed',
      },
      photos: [],
      notes: [],
      review: {
        reviewer: {
          id: 'r1',
          name: 'Engineer',
          role: 'agricultural_engineer',
        },
        decision: 'approved',
        reviewedAt: now,
        qualityChecks: [],
      },
      revisionNumber: 1,
      previousSurveyId: null,
      createdAt: now,
      updatedAt: now,
      approvedAt: now,
      rejectionReason: null,
      audit: {
        events: [
          { type: 'SURVEY_CREATED', timestamp: now, actorId: 's1' },
          { type: 'SURVEY_APPROVED', timestamp: now, reviewerId: 'r1' },
        ],
      },
    };

    await repo1.create(survey);
    await closePool();
    await resetDatabaseClient();

    const repo2 = new PostgresFieldSurveyRepository();
    const loaded = await repo2.findById(surveyId);
    expect(loaded?.id).toBe(surveyId);
    expect(loaded?.status).toBe('approved');
    expect(loaded?.samples).toHaveLength(5);
    expect(loaded?.audit.events.map((e) => e.type)).toEqual([
      'SURVEY_CREATED',
      'SURVEY_APPROVED',
    ]);

    const latest = await repo2.findLatestApprovedByParcelId(survey.parcelId);
    expect(latest?.id).toBe(surveyId);
  });

  it('publishes calibration profile and keeps active after restart', async ({ skip }) => {
    if (!connected) skip();
    const admin: ExpertActor = {
      id: 'admin',
      name: 'Admin',
      role: 'administrator',
    };
    const publisher: ExpertActor = {
      id: 'pub',
      name: 'Publisher',
      role: 'authorized_reviewer',
    };
    const soil: ExpertActor = {
      id: 'soil',
      name: 'Soil',
      role: 'soil_scientist',
    };

    const repo1 = new PostgresCalibrationManagementRepository();
    const crops = new CropKnowledgeService(getSharedCropRepository());
    const service = new CalibrationManagementService(repo1, crops);
    const req = crops.getById('pistachio').physicalRequirements;

    const { profile } = await service.createProfile({
      cropId: 'pistachio',
      requirements: req,
      createdBy: admin,
      sources: [
        {
          id: randomUUID(),
          type: 'expert_opinion',
          title: 'source',
          supports: ['rootableSoilDepth'],
          verificationStatus: 'unverified',
        },
      ],
    });
    await service.submit(profile.id, admin, 'submit');
    await service.startReview(profile.id, publisher, 'review');
    await service.addReview({
      profileId: profile.id,
      reviewer: soil,
      decision: 'approved',
      reviewedFields: ['rootableSoilDepth'],
      comments: 'ok',
    });
    await service.approve(profile.id, publisher, 'approve');
    await service.impactAnalysis({
      profileId: profile.id,
      actor: admin,
      existingScores: { pistachio: { score: 80, rank: 2 } },
    });
    const published = await service.publish(profile.id, publisher, 'publish');
    expect(published.profile.status).toBe('published');

    await closePool();
    await resetDatabaseClient();

    const repo2 = new PostgresCalibrationManagementRepository();
    const service2 = new CalibrationManagementService(repo2, crops);
    const active = await service2.getActive('pistachio');
    expect(active.profile?.id).toBe(profile.id);
    expect(active.profile?.status).toBe('published');
    expect(active.fallback).toBeNull();

    const resolved = await service2.resolveForCrop('pistachio', { mode: 'active' });
    expect(resolved.resolution.fallbackUsed).toBe(false);
    expect(resolved.resolution.profileId).toBe(profile.id);

    const audit = await repo2.listAuditByProfileId(profile.id);
    expect(audit.length).toBeGreaterThan(0);
    const seq = audit.map((e) => Number(e.metadata?.sequenceNumber ?? 0));
    expect(seq).toEqual([...seq].sort((a, b) => a - b));
  });

  it('bootstrap is idempotent under unique bootstrap_key', async ({ skip }) => {
    if (!connected) skip();
    const actor: ExpertActor = {
      id: 'a',
      name: 'A',
      role: 'administrator',
    };
    const repo = new PostgresCalibrationManagementRepository();
    const crops = new CropKnowledgeService(getSharedCropRepository());
    const service = new CalibrationManagementService(repo, crops);
    const first = await service.bootstrapFromStatic(actor);
    expect(first.created).toBe(14);
    const second = await service.bootstrapFromStatic(actor);
    expect(second.created).toBe(0);
    expect(second.skipped).toBe(14);
  });

  it('optimistic concurrency rejects stale expectedVersion', async ({ skip }) => {
    if (!connected) skip();
    const repo = new PostgresFieldSurveyRepository();
    const now = new Date().toISOString();
    const survey: FieldSurvey = {
      id: randomUUID(),
      parcelId: 'p|d|n|1|1',
      parcelReference: {
        province: 'P',
        district: 'D',
        neighborhood: 'N',
        block: '1',
        parcel: '1',
      },
      status: 'draft',
      surveyDate: now,
      surveyor: { id: 's', name: 'S' },
      samples: [],
      parcelObservations: {},
      photos: [],
      notes: [],
      review: null,
      revisionNumber: 1,
      createdAt: now,
      updatedAt: now,
      audit: { events: [{ type: 'SURVEY_CREATED', timestamp: now }] },
    };
    const created = await repo.create(survey);
    const v1 = (created as FieldSurvey & { rowVersion?: number }).rowVersion ?? 1;
    await repo.update({ ...created, notes: ['first'], updatedAt: new Date().toISOString() });
    await expect(
      repo.update(
        { ...created, notes: ['stale'], updatedAt: new Date().toISOString() },
        { expectedVersion: v1 },
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});
