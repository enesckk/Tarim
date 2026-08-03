import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../../app.js';
import { resetEnvCache } from '../../../config/env.js';
import { resetSharedCalibrationRepository } from '../../crop-recommendation/calibration/calibration-profile.repository.js';
import { getSharedCalibrationRepository } from '../../crop-recommendation/calibration/calibration-profile.repository.js';
import { getSharedCropRepository } from '../../crop-recommendation/repositories/json-crop.repository.js';
import { CropKnowledgeService } from '../../crop-recommendation/services/crop-knowledge.service.js';
import {
  InMemoryCalibrationManagementRepository,
  resetSharedCalibrationManagementRepository,
} from '../repositories/calibration-management.repository.js';
import { CalibrationManagementService } from '../services/calibration-management.service.js';
import {
  canElevateFieldStatus,
  resolveOverallValidationStatus,
  validateRequirementsPayload,
} from '../services/calibration-validation.helpers.js';
import { DEFAULT_CALIBRATION_MANAGEMENT } from '../types/calibration-management.types.js';
import type { ExpertActor } from '../types/calibration-management.types.js';
import {
  isValidTopNSelection,
  selectCropsForReport,
} from '../../crop-recommendation/reporting/crop-report-selection.js';

const admin: ExpertActor = {
  id: 'admin-1',
  name: 'Admin',
  role: 'administrator',
};
const soilScientist: ExpertActor = {
  id: 'soil-1',
  name: 'Soil Expert',
  role: 'soil_scientist',
  organization: 'Test Org',
};
const publisher: ExpertActor = {
  id: 'rev-1',
  name: 'Authorized Reviewer',
  role: 'authorized_reviewer',
};

function ensureEnv(enabled = true): void {
  process.env.COPERNICUS_CLIENT_ID = process.env.COPERNICUS_CLIENT_ID || 'test-id';
  process.env.COPERNICUS_CLIENT_SECRET =
    process.env.COPERNICUS_CLIENT_SECRET || 'test-secret';
  process.env.CROP_PHYSICAL_COMPATIBILITY_ENABLED = 'true';
  process.env.CALIBRATION_MANAGEMENT_ENABLED = enabled ? 'true' : 'false';
  process.env.TERRAIN_PROVIDER = 'mock';
  process.env.SOIL_PROVIDER = 'mock';
  process.env.PARCEL_PROVIDER = 'mock';
  process.env.LAND_USABILITY_ENABLED = 'true';
  resetEnvCache();
  resetSharedCalibrationRepository();
  resetSharedCalibrationManagementRepository();
}

async function withServer(
  fn: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

function createService() {
  const repo = new InMemoryCalibrationManagementRepository();
  const crops = new CropKnowledgeService(getSharedCropRepository());
  return { service: new CalibrationManagementService(repo, crops), repo, crops };
}

describe('Calibration Management', () => {
  beforeEach(() => ensureEnv(true));
  afterEach(() => {
    resetSharedCalibrationManagementRepository();
    resetSharedCalibrationRepository();
    resetEnvCache();
  });

  it('loads calibration v1.8 with calibrationManagement block', () => {
    const profile = getSharedCalibrationRepository().get();
    expect(profile.version).toBe('2.0');
    expect(profile.calibrationManagement?.publication.minimumReviewCount).toBe(1);
    expect(profile.cropPhysicalCompatibility).toBeTruthy();
  });

  it('bootstraps 14 draft profiles idempotently from static requirements', async () => {
    const { service, crops } = createService();
    const first = await service.bootstrapFromStatic(admin);
    expect(first.totalCrops).toBe(14);
    expect(first.created).toBe(14);
    expect(first.skipped).toBe(0);
    expect(first.initialStatus).toBe('draft');
    expect(first.sourceType).toBe('internal_initial_assumption');
    expect(first.persistence.durable).toBe(false);

    for (const id of first.profileIds) {
      const { profile } = await service.getProfile(id);
      expect(profile.status).toBe('draft');
      expect(profile.overallValidationStatus).toBe('unvalidated');
      const staticCrop = crops.getById(profile.cropId);
      expect(profile.requirements).toEqual(staticCrop.physicalRequirements);
    }

    const second = await service.bootstrapFromStatic(admin);
    expect(second.created).toBe(0);
    expect(second.skipped).toBe(14);
  });

  it('enforces status transitions and published immutability', async () => {
    const { service, crops } = createService();
    const pistachio = crops.getById('pistachio');
    const { profile } = await service.createProfile({
      cropId: 'pistachio',
      requirements: pistachio.physicalRequirements,
      createdBy: admin,
      sources: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          type: 'internal_initial_assumption',
          title: 'test',
          supports: ['rootableSoilDepth'],
          verificationStatus: 'unverified',
        },
      ],
    });

    await expect(
      service.approve(profile.id, publisher, 'too early'),
    ).rejects.toMatchObject({ statusCode: 409 });

    await service.submit(profile.id, admin, 'submit');
    await service.startReview(profile.id, publisher, 'start');
    await service.addReview({
      profileId: profile.id,
      reviewer: soilScientist,
      decision: 'approved_with_comments',
      reviewedFields: ['rootableSoilDepth'],
      comments: 'ok for draft review',
      fieldStatusUpdates: { rootableSoilDepth: 'expert_reviewed' },
    });
    await service.approve(profile.id, publisher, 'approve');

    await expect(
      service.updateProfile(profile.id, {
        actor: admin,
        reason: 'edit approved',
        notes: ['nope'],
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    await service.impactAnalysis({
      profileId: profile.id,
      actor: admin,
      existingScores: { pistachio: { score: 81.92, rank: 3 } },
    });
    const published = await service.publish(profile.id, publisher, 'publish');
    expect(published.profile.status).toBe('published');

    await expect(
      service.updateProfile(profile.id, {
        actor: admin,
        reason: 'edit published',
        notes: ['immutable'],
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    const revision = await service.createRevision(
      profile.id,
      admin,
      'new revision',
    );
    expect(revision.profile.status).toBe('draft');
    expect(revision.profile.baseProfileId).toBe(profile.id);
    expect(revision.profile.version).toBeGreaterThan(profile.version);
  });

  it('rejects unauthorized reviewer and admin-alone field_validated', async () => {
    expect(
      canElevateFieldStatus(admin, 'rootableSoilDepth', 'field_validated'),
    ).toBe(false);
    expect(
      canElevateFieldStatus(soilScientist, 'rootableSoilDepth', 'field_validated'),
    ).toBe(true);
    expect(
      canElevateFieldStatus(
        { id: 'm', name: 'mech', role: 'agricultural_mechanization_expert' },
        'drainage',
        'expert_reviewed',
      ),
    ).toBe(false);

    const { service, crops } = createService();
    const { profile } = await service.createProfile({
      cropId: 'pistachio',
      requirements: crops.getById('pistachio').physicalRequirements,
      createdBy: admin,
      sources: [
        {
          id: '00000000-0000-4000-8000-000000000002',
          type: 'expert_opinion',
          title: 'expert note',
          supports: ['rootableSoilDepth'],
          verificationStatus: 'unverified',
        },
      ],
    });
    await service.submit(profile.id, admin, 's');
    await service.startReview(profile.id, publisher, 'r');
    await expect(
      service.addReview({
        profileId: profile.id,
        reviewer: {
          id: 'mech',
          name: 'Mech',
          role: 'agricultural_mechanization_expert',
        },
        decision: 'approved',
        reviewedFields: ['rootableSoilDepth'],
        comments: 'unauthorized',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('resolves overall validation status deterministically', () => {
    const fields = {
      rootableSoilDepth: 'unvalidated',
      slope: 'unvalidated',
      ruggedness: 'unvalidated',
      surfaceStoniness: 'unvalidated',
      bedrockOutcrop: 'unvalidated',
      machineAccess: 'unvalidated',
      drainage: 'unvalidated',
    } as const;
    expect(
      resolveOverallValidationStatus({ ...fields }, DEFAULT_CALIBRATION_MANAGEMENT),
    ).toBe('unvalidated');
    expect(
      resolveOverallValidationStatus(
        { ...fields, slope: 'literature_supported' },
        DEFAULT_CALIBRATION_MANAGEMENT,
      ),
    ).toBe('partially_validated');
    expect(
      resolveOverallValidationStatus(
        {
          ...fields,
          rootableSoilDepth: 'disputed',
          slope: 'expert_reviewed',
        },
        DEFAULT_CALIBRATION_MANAGEMENT,
      ),
    ).toBe('disputed');
  });

  it('validates requirement ordering and rejects invalid submit', async () => {
    const bad = validateRequirementsPayload({
      rootableSoilDepth: {
        minimumCm: 90,
        preferredMinimumCm: 60,
        optimalMinimumCm: 120,
        importance: 'high',
      },
      slope: {
        preferredMaximumMeanPercent: 8,
        acceptableMaximumMeanPercent: 15,
        maximumMeanPercent: 25,
        maximumP90Percent: 35,
        importance: 'medium',
      },
      ruggedness: {
        preferredMaximumClass: 'low',
        acceptableMaximumClass: 'medium',
        importance: 'medium',
      },
      surfaceStoninessTolerance: {
        preferredMaximum: 'low',
        acceptableMaximum: 'medium',
        maximum: 'high',
        importance: 'high',
      },
      bedrockOutcropTolerance: {
        preferredMaximum: 'not_observed',
        acceptableMaximum: 'isolated',
        maximum: 'scattered',
        importance: 'high',
      },
      machineAccessRequirement: {
        minimum: 'accessible_with_limitations',
        importance: 'medium',
      },
      drainageRequirement: {
        preferred: ['adequate'],
        acceptable: ['moderately_limited'],
        notPreferred: ['poor'],
        importance: 'high',
      },
      source: 'crop-knowledge',
      validationStatus: 'unvalidated',
    });
    expect(bad.ok).toBe(false);
  });

  it('runs Güngürge pistachio impact analysis with score/rank invariants', async () => {
    const { service, crops } = createService();
    const staticReq = structuredClone(
      crops.getById('pistachio').physicalRequirements,
    ) as Record<string, unknown>;
    const depth = staticReq.rootableSoilDepth as Record<string, number>;
    expect(depth.minimumCm).toBe(60);

    const candidateReq = structuredClone(staticReq);
    (candidateReq.rootableSoilDepth as Record<string, number>).minimumCm = 50;
    (candidateReq.rootableSoilDepth as Record<string, number>).preferredMinimumCm = 80;
    (candidateReq.rootableSoilDepth as Record<string, number>).optimalMinimumCm = 110;

    const { profile } = await service.createProfile({
      cropId: 'pistachio',
      requirements: candidateReq,
      createdBy: admin,
      notes: ['impact-analysis candidate only; not scientifically endorsed'],
      sources: [
        {
          id: '00000000-0000-4000-8000-000000000099',
          type: 'internal_initial_assumption',
          title: 'impact fixture candidate',
          supports: ['rootableSoilDepth.minimumCm'],
          verificationStatus: 'unverified',
        },
      ],
    });

    const impact = await service.impactAnalysis({
      profileId: profile.id,
      actor: admin,
      includeDetails: true,
      existingScores: { pistachio: { score: 81.92, rank: 3 } },
    });

    expect(impact.summary.scoreChangedCount).toBe(0);
    expect(impact.summary.rankChangedCount).toBe(0);
    const cmp = impact.comparisons[0]!;
    expect(cmp.scoreBefore).toBe(81.92);
    expect(cmp.scoreAfter).toBe(81.92);
    expect(cmp.rankBefore).toBe(3);
    expect(cmp.rankAfter).toBe(3);
    expect(cmp.baseline.classification).toBeTruthy();
    expect(cmp.candidate.classification).toBeTruthy();
    // Active published must remain untouched
    const active = await service.getActive('pistachio');
    expect(active.profile).toBeNull();
  });

  it('uses static fallback for active resolution when nothing published', async () => {
    const { service } = createService();
    const resolved = await service.resolveForCrop('pistachio', { mode: 'active' });
    expect(resolved.resolution.fallbackUsed).toBe(true);
    expect(resolved.resolution.source).toBe('static_unvalidated_fallback');
  });

  it('rejects draft explicit profile in normal analysis and allows dry-run', async () => {
    const { service, crops } = createService();
    const { profile } = await service.createProfile({
      cropId: 'pistachio',
      requirements: crops.getById('pistachio').physicalRequirements,
      createdBy: admin,
      sources: [
        {
          id: '00000000-0000-4000-8000-000000000010',
          type: 'internal_initial_assumption',
          title: 'draft',
          supports: ['rootableSoilDepth'],
          verificationStatus: 'unverified',
        },
      ],
    });

    await expect(
      service.resolveForCrop('pistachio', {
        mode: 'explicit',
        explicitProfileId: profile.id,
        dryRun: false,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    const dry = await service.resolveForCrop('pistachio', {
      mode: 'explicit',
      explicitProfileId: profile.id,
      dryRun: true,
    });
    expect(dry.resolution.mode).toBe('explicit');
    expect(dry.resolution.profileId).toBe(profile.id);
  });

  it('publishes one active profile and supersedes previous', async () => {
    const { service, crops } = createService();
    const req = crops.getById('pistachio').physicalRequirements;

    async function publishVersion(actorNote: string) {
      const { profile } = await service.createProfile({
        cropId: 'pistachio',
        requirements: req,
        createdBy: admin,
        notes: [actorNote],
        sources: [
          {
            id: crypto.randomUUID(),
            type: 'expert_opinion',
            title: actorNote,
            supports: ['rootableSoilDepth'],
            verificationStatus: 'unverified',
          },
        ],
      });
      await service.submit(profile.id, admin, 's');
      await service.startReview(profile.id, publisher, 'r');
      await service.addReview({
        profileId: profile.id,
        reviewer: soilScientist,
        decision: 'approved',
        reviewedFields: ['rootableSoilDepth', 'drainage'],
        comments: 'ok',
        fieldStatusUpdates: {
          rootableSoilDepth: 'expert_reviewed',
          drainage: 'literature_supported',
        },
      });
      await service.approve(profile.id, publisher, 'a');
      await service.impactAnalysis({
        profileId: profile.id,
        actor: admin,
        existingScores: { pistachio: { score: 80, rank: 2 } },
      });
      return service.publish(profile.id, publisher, 'p');
    }

    const first = await publishVersion('v1');
    const second = await publishVersion('v2');
    expect(second.profile.status).toBe('published');
    const prev = await service.getProfile(first.profile.id);
    expect(prev.profile.status).toBe('superseded');
    const active = await service.getActive('pistachio');
    expect(active.profile?.id).toBe(second.profile.id);
  });

  it('rollback creates a new draft revision without rewriting history', async () => {
    const { service, crops } = createService();
    const { profile } = await service.createProfile({
      cropId: 'wheat',
      requirements: crops.getById('wheat').physicalRequirements,
      createdBy: admin,
      sources: [
        {
          id: crypto.randomUUID(),
          type: 'expert_opinion',
          title: 'wheat source',
          supports: ['slope'],
          verificationStatus: 'unverified',
        },
      ],
    });
    await service.submit(profile.id, admin, 's');
    await service.startReview(profile.id, publisher, 'r');
    await service.addReview({
      profileId: profile.id,
      reviewer: soilScientist,
      decision: 'approved',
      reviewedFields: ['rootableSoilDepth'],
      comments: 'ok',
    });
    await service.approve(profile.id, publisher, 'a');
    await service.impactAnalysis({ profileId: profile.id, actor: admin });
    await service.publish(profile.id, publisher, 'p');

    const rollback = await service.rollback(profile.id, admin, 'rollback to this');
    expect(rollback.profile.status).toBe('draft');
    expect(rollback.profile.baseProfileId).toBe(profile.id);
    const stillPublished = await service.getProfile(profile.id);
    expect(stillPublished.profile.status).toBe('published');
    const audit = stillPublished.audit;
    expect(audit.some((e) => e.type === 'PROFILE_PUBLISHED')).toBe(true);
  });

  it('Top-5 selection excludes rank 7; selected crops keep any rank with label', () => {
    const ranked = [
      { cropId: 'a', rank: 1 },
      { cropId: 'b', rank: 2 },
      { cropId: 'c', rank: 3 },
      { cropId: 'd', rank: 4 },
      { cropId: 'e', rank: 5 },
      { cropId: 'pistachio', rank: 7 },
    ];
    const top = selectCropsForReport({ ranked, topN: 5 });
    expect(top.label).toBe('Top-5');
    expect(top.cropIds).not.toContain('pistachio');
    expect(isValidTopNSelection(top.ranks, 5)).toBe(true);

    const selected = selectCropsForReport({
      ranked,
      cropIds: ['pistachio', 'a'],
    });
    expect(selected.label).toBe('Selected Crops');
    expect(selected.cropIds).toContain('pistachio');
    expect(selected.ranks).toContain(7);
  });

  it('HTTP: feature flag disabled returns 503', async () => {
    ensureEnv(false);
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/calibration-management/bootstrap`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actor: admin }),
      });
      expect(res.status).toBe(503);
      const body = (await res.json()) as { details?: { code?: string } };
      expect(body.details?.code).toBe('CALIBRATION_MANAGEMENT_DISABLED');
    });
  });

  it('HTTP: create → submit → review → approve → impact → publish → active', async () => {
    await withServer(async (base) => {
      const crops = new CropKnowledgeService(getSharedCropRepository());
      const requirements = crops.getById('barley').physicalRequirements;
      const createRes = await fetch(
        `${base}/api/calibration-management/crop-requirements`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            cropId: 'barley',
            requirements,
            createdBy: admin,
            sources: [
              {
                type: 'expert_opinion',
                title: 'barley source',
                supports: ['rootableSoilDepth'],
                verificationStatus: 'unverified',
              },
            ],
          }),
        },
      );
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as {
        profile: { id: string };
        persistence: { durable: boolean };
      };
      expect(created.persistence.durable).toBe(false);
      const id = created.profile.id;

      for (const path of [
        'submit',
        'start-review',
      ] as const) {
        const r = await fetch(
          `${base}/api/calibration-management/crop-requirements/${id}/${path}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ actor: publisher, reason: path }),
          },
        );
        expect(r.status).toBe(200);
      }

      const reviewRes = await fetch(
        `${base}/api/calibration-management/crop-requirements/${id}/reviews`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            reviewer: soilScientist,
            decision: 'approved',
            reviewedFields: ['rootableSoilDepth'],
            comments: 'looks fine',
            fieldStatusUpdates: { rootableSoilDepth: 'expert_reviewed' },
          }),
        },
      );
      expect(reviewRes.status).toBe(201);

      const approveRes = await fetch(
        `${base}/api/calibration-management/crop-requirements/${id}/approve`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ actor: publisher, reason: 'approve' }),
        },
      );
      expect(approveRes.status).toBe(200);

      const impactRes = await fetch(
        `${base}/api/calibration-management/crop-requirements/${id}/impact-analysis`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            actor: admin,
            existingScores: { barley: { score: 70, rank: 1 } },
          }),
        },
      );
      expect(impactRes.status).toBe(200);
      const impact = (await impactRes.json()) as {
        summary: { scoreChangedCount: number; rankChangedCount: number };
      };
      expect(impact.summary.scoreChangedCount).toBe(0);
      expect(impact.summary.rankChangedCount).toBe(0);

      const publishRes = await fetch(
        `${base}/api/calibration-management/crop-requirements/${id}/publish`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ actor: publisher, reason: 'publish' }),
        },
      );
      expect(publishRes.status).toBe(200);

      const activeRes = await fetch(
        `${base}/api/calibration-management/crops/barley/active-profile`,
      );
      expect(activeRes.status).toBe(200);
      const active = (await activeRes.json()) as {
        profile: { id: string; status: string } | null;
      };
      expect(active.profile?.id).toBe(id);
      expect(active.profile?.status).toBe('published');

      const compareRevision = await fetch(
        `${base}/api/calibration-management/crop-requirements/${id}/create-revision`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ actor: admin, reason: 'revise' }),
        },
      );
      expect(compareRevision.status).toBe(201);
      const rev = (await compareRevision.json()) as { profile: { id: string } };

      const cmp = await fetch(
        `${base}/api/calibration-management/crop-requirements/${id}/compare/${rev.profile.id}`,
      );
      expect(cmp.status).toBe(200);
    });
  });

  it('CPC analyze uses static fallback by default and includes cropSelection', async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/crop-physical-compatibility/analyze`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [37.0, 37.0],
                [37.001, 37.0],
                [37.001, 37.001],
                [37.0, 37.001],
                [37.0, 37.0],
              ],
            ],
          },
          cropIds: ['pistachio', 'wheat'],
          includeDetails: false,
          includeExistingScores: false,
        }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        cropSelection: { label: string };
        crops: Array<{
          requirementResolution: { fallbackUsed: boolean; source: string };
        }>;
      };
      expect(body.cropSelection.label).toBe('Selected Crops');
      expect(body.crops[0]?.requirementResolution.fallbackUsed).toBe(true);
      expect(body.crops[0]?.requirementResolution.source).toBe(
        'static_unvalidated_fallback',
      );
    });
  });
});
