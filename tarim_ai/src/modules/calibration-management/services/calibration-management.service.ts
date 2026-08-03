import { ApiError } from '../../../utils/api-error.js';
import { getEnv } from '../../../config/env.js';
import { currentPersistenceMeta } from '../../database/persistence-factory.js';
import type { CropKnowledgeService } from '../../crop-recommendation/services/crop-knowledge.service.js';
import type { CalibrationManagementRepository } from '../repositories/calibration-management.repository.js';
import type {
  CropRequirementProfile,
  ExpertActor,
  FieldValidationStatus,
  RequirementChange,
  RequirementFieldKey,
  RequirementSource,
  ReviewDecision,
} from '../types/calibration-management.types.js';
import { CropRequirementProfileService } from './crop-requirement-profile.service.js';
import { ExpertReviewService } from './expert-review.service.js';
import {
  ImpactAnalysisService,
  ProfileComparisonService,
  defaultUnvalidatedSource,
  requirementSupportPaths,
} from './impact-bootstrap.service.js';
import { emptyFieldValidationStatus } from './calibration-validation.helpers.js';

export class CalibrationManagementService {
  readonly profiles: CropRequirementProfileService;
  readonly reviews: ExpertReviewService;
  readonly impact: ImpactAnalysisService;
  readonly comparison: ProfileComparisonService;

  constructor(
    private readonly repo: CalibrationManagementRepository,
    private readonly cropKnowledge: CropKnowledgeService,
  ) {
    this.profiles = new CropRequirementProfileService(repo);
    this.reviews = new ExpertReviewService(repo);
    this.impact = new ImpactAnalysisService(repo, cropKnowledge);
    this.comparison = new ProfileComparisonService(this.profiles);
  }

  assertEnabled(): void {
    if (!getEnv().CALIBRATION_MANAGEMENT_ENABLED) {
      throw new ApiError(503, 'Calibration management is disabled', {
        code: 'CALIBRATION_MANAGEMENT_DISABLED',
      });
    }
  }

  persistenceMeta() {
    return currentPersistenceMeta();
  }

  async bootstrapFromStatic(actor: ExpertActor) {
    this.assertEnabled();
    const crops = this.cropKnowledge.listAll();
    let created = 0;
    let skipped = 0;
    const profileIds: string[] = [];

    for (const crop of crops) {
      const key = `bootstrap:static:${crop.id}:v1`;
      const existing = await this.repo.findByBootstrapKey(key);
      if (existing) {
        skipped += 1;
        profileIds.push(existing.id);
        continue;
      }
      if (!crop.physicalRequirements) {
        skipped += 1;
        continue;
      }
      const supports = requirementSupportPaths(crop.physicalRequirements);
      const profile = await this.profiles.createDraft({
        cropId: crop.id,
        requirements: crop.physicalRequirements,
        createdBy: actor,
        notes: [
          'Bootstrapped from static crop knowledge base physicalRequirements.',
          'Unvalidated initial assumption; not auto-published.',
        ],
        sources: [defaultUnvalidatedSource(supports)],
        bootstrapKey: key,
        fieldValidationStatus: emptyFieldValidationStatus(),
      });
      created += 1;
      profileIds.push(profile.id);
    }

    return {
      totalCrops: crops.length,
      created,
      skipped,
      profileIds,
      initialStatus: 'draft',
      initialValidation: 'unvalidated',
      sourceType: 'internal_initial_assumption',
      persistence: this.persistenceMeta(),
    };
  }

  async createProfile(input: {
    cropId: string;
    requirements: unknown;
    createdBy: ExpertActor;
    notes?: string[];
    sources?: RequirementSource[];
  }) {
    this.assertEnabled();
    this.cropKnowledge.getById(input.cropId);
    const profile = await this.profiles.createDraft(input);
    return { profile, persistence: this.persistenceMeta() };
  }

  async getProfile(id: string) {
    this.assertEnabled();
    const profile = await this.profiles.getById(id);
    const checks = this.profiles.buildValidationChecks(profile);
    const audit = await this.repo.listAuditByProfileId(id);
    return { profile, validation: { checks }, audit, persistence: this.persistenceMeta() };
  }

  async updateProfile(
    id: string,
    input: {
      actor: ExpertActor;
      requirements?: unknown;
      notes?: string[];
      sources?: RequirementSource[];
      changes?: RequirementChange[];
      fieldValidationStatus?: Partial<Record<RequirementFieldKey, FieldValidationStatus>>;
      reason: string;
    },
  ) {
    this.assertEnabled();
    const profile = await this.profiles.updateDraft(id, input);
    return { profile, persistence: this.persistenceMeta() };
  }

  async submit(id: string, actor: ExpertActor, reason: string) {
    this.assertEnabled();
    return {
      profile: await this.reviews.submit(id, actor, reason),
      persistence: this.persistenceMeta(),
    };
  }

  async startReview(id: string, actor: ExpertActor, reason: string) {
    this.assertEnabled();
    return {
      profile: await this.reviews.startReview(id, actor, reason),
      persistence: this.persistenceMeta(),
    };
  }

  async addReview(input: {
    profileId: string;
    reviewer: ExpertActor;
    decision: ReviewDecision;
    reviewedFields: RequirementFieldKey[];
    comments: string;
    suggestedChanges?: Array<{ path: string; suggestion: string }>;
    fieldStatusUpdates?: Partial<Record<RequirementFieldKey, FieldValidationStatus>>;
  }) {
    this.assertEnabled();
    return {
      profile: await this.reviews.addReview(input),
      persistence: this.persistenceMeta(),
    };
  }

  async approve(id: string, actor: ExpertActor, reason: string) {
    this.assertEnabled();
    return {
      profile: await this.reviews.approve(id, actor, reason),
      persistence: this.persistenceMeta(),
    };
  }

  async reject(id: string, actor: ExpertActor, reason: string) {
    this.assertEnabled();
    return {
      profile: await this.reviews.reject(id, actor, reason),
      persistence: this.persistenceMeta(),
    };
  }

  async publish(id: string, actor: ExpertActor, reason: string) {
    this.assertEnabled();
    return {
      profile: await this.reviews.publish(id, actor, reason),
      persistence: this.persistenceMeta(),
    };
  }

  async impactAnalysis(input: {
    profileId: string;
    actor: ExpertActor;
    includeDetails?: boolean;
    existingScores?: Record<string, { score: number; rank: number }>;
  }) {
    this.assertEnabled();
    return this.impact.run(input);
  }

  async compare(id: string, otherId: string) {
    this.assertEnabled();
    return {
      ...(await this.comparison.compare(id, otherId)),
      persistence: this.persistenceMeta(),
    };
  }

  async getActive(cropId: string) {
    this.assertEnabled();
    this.cropKnowledge.getById(cropId);
    const profile = await this.profiles.getActive(cropId);
    return {
      cropId,
      profile,
      fallback: profile
        ? null
        : {
            source: 'static_unvalidated_fallback',
            validationStatus: 'unvalidated',
          },
      persistence: this.persistenceMeta(),
    };
  }

  async createRevision(id: string, actor: ExpertActor, reason: string) {
    this.assertEnabled();
    return {
      profile: await this.reviews.createRevision(id, actor, reason),
      persistence: this.persistenceMeta(),
    };
  }

  async rollback(targetId: string, actor: ExpertActor, reason: string) {
    this.assertEnabled();
    return {
      profile: await this.reviews.requestRollback(targetId, actor, reason),
      persistence: this.persistenceMeta(),
    };
  }

  /** Resolve requirements for CPC: active published → static fallback. */
  async resolveForCrop(
    cropId: string,
    options?: {
      mode?: 'active' | 'static_fallback' | 'explicit';
      explicitProfileId?: string;
      dryRun?: boolean;
    },
  ): Promise<{
    requirements: unknown | null;
    resolution: {
      mode: string;
      profileId: string | null;
      profileVersion: number | null;
      profileStatus: string | null;
      validationStatus: string;
      fallbackUsed: boolean;
      source: string;
    };
  }> {
    const mode = options?.mode ?? 'active';
    const crop = this.cropKnowledge.getById(cropId);

    if (mode === 'static_fallback' || !getEnv().CALIBRATION_MANAGEMENT_ENABLED) {
      return {
        requirements: crop.physicalRequirements ?? null,
        resolution: {
          mode: 'static_fallback',
          profileId: null,
          profileVersion: null,
          profileStatus: null,
          validationStatus: 'unvalidated',
          fallbackUsed: true,
          source: 'static_unvalidated_fallback',
        },
      };
    }

    if (mode === 'explicit') {
      if (!options?.explicitProfileId) {
        throw new ApiError(400, 'explicitProfileId is required for explicit mode');
      }
      const profile = await this.profiles.getById(options.explicitProfileId);
      if (profile.cropId !== cropId) {
        throw new ApiError(400, 'Profile cropId mismatch');
      }
      if (profile.status !== 'published' && !options.dryRun) {
        throw new ApiError(
          409,
          'Non-published profiles can only be used with dryRun=true',
          { status: profile.status },
        );
      }
      if (
        ['rejected', 'archived', 'superseded'].includes(profile.status) &&
        !options.dryRun
      ) {
        throw new ApiError(409, `Profile status ${profile.status} cannot be used`);
      }
      return {
        requirements: profile.requirements,
        resolution: {
          mode: 'explicit',
          profileId: profile.id,
          profileVersion: profile.version,
          profileStatus: profile.status,
          validationStatus: profile.overallValidationStatus,
          fallbackUsed: false,
          source: 'published_calibration_profile',
        },
      };
    }

    // active
    const active = await this.repo.findActivePublishedByCropId(cropId);
    if (active) {
      return {
        requirements: active.requirements,
        resolution: {
          mode: 'active',
          profileId: active.id,
          profileVersion: active.version,
          profileStatus: active.status,
          validationStatus: active.overallValidationStatus,
          fallbackUsed: false,
          source: 'published_calibration_profile',
        },
      };
    }

    return {
      requirements: crop.physicalRequirements ?? null,
      resolution: {
        mode: 'active',
        profileId: null,
        profileVersion: null,
        profileStatus: null,
        validationStatus: 'unvalidated',
        fallbackUsed: true,
        source: 'static_unvalidated_fallback',
      },
    };
  }
}

export type { CropRequirementProfile };
