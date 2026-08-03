import { ApiError } from '../../../utils/api-error.js';
import type { CalibrationManagementRepository } from '../repositories/calibration-management.repository.js';
import type {
  CropRequirementProfile,
  ExpertActor,
  FieldValidationStatus,
  ProfileReview,
  ProfileStatus,
  RequirementFieldKey,
  ReviewDecision,
  CalibrationAuditEvent,
} from '../types/calibration-management.types.js';
import {
  resolveCalibrationManagementCalibration,
} from '../types/calibration-management.types.js';
import { ScoreCalibrationService } from '../../crop-recommendation/calibration/score-calibration.service.js';
import {
  CalibrationAuditService,
  CropRequirementProfileService,
} from './crop-requirement-profile.service.js';
import {
  canElevateFieldStatus,
  canPublish,
  createId,
  resolveOverallValidationStatus,
  reviewerAuthorizedForField,
  validateRequirementsPayload,
} from './calibration-validation.helpers.js';

export class ExpertReviewService {
  private readonly profiles: CropRequirementProfileService;
  private readonly audit: CalibrationAuditService;
  private readonly calibration = new ScoreCalibrationService();

  constructor(private readonly repo: CalibrationManagementRepository) {
    this.profiles = new CropRequirementProfileService(repo);
    this.audit = new CalibrationAuditService(repo);
  }

  async submit(id: string, actor: ExpertActor, reason: string) {
    const profile = await this.profiles.getById(id);
    const schema = validateRequirementsPayload(profile.requirements);
    if (!schema.ok) {
      throw new ApiError(422, 'Cannot submit invalid requirements', {
        issues: schema.issues,
      });
    }
    if (profile.sources.length < 1) {
      throw new ApiError(422, 'At least one source is required before submit');
    }
    return this.profiles.transition(
      id,
      'submitted',
      actor,
      reason,
      'PROFILE_SUBMITTED',
    );
  }

  async startReview(id: string, actor: ExpertActor, reason: string) {
    return this.profiles.transition(
      id,
      'under_review',
      actor,
      reason,
      'REVIEW_STARTED',
    );
  }

  async addReview(input: {
    profileId: string;
    reviewer: ExpertActor;
    decision: ReviewDecision;
    reviewedFields: RequirementFieldKey[];
    comments: string;
    suggestedChanges?: Array<{ path: string; suggestion: string }>;
    fieldStatusUpdates?: Partial<Record<RequirementFieldKey, FieldValidationStatus>>;
  }): Promise<CropRequirementProfile> {
    const profile = await this.profiles.getById(input.profileId);
    if (profile.status !== 'under_review') {
      throw new ApiError(409, 'Reviews can only be added while under_review', {
        status: profile.status,
      });
    }

    for (const field of input.reviewedFields) {
      if (!reviewerAuthorizedForField(input.reviewer.role, field)) {
        throw new ApiError(403, `Reviewer not authorized for field ${field}`, {
          role: input.reviewer.role,
          field,
        });
      }
    }

    const fieldValidationStatus = { ...profile.fieldValidationStatus };
    if (input.fieldStatusUpdates) {
      for (const [field, status] of Object.entries(input.fieldStatusUpdates) as Array<
        [RequirementFieldKey, FieldValidationStatus]
      >) {
        if (!canElevateFieldStatus(input.reviewer, field, status)) {
          throw new ApiError(
            403,
            `Reviewer cannot set ${field} to ${status}`,
            { role: input.reviewer.role, field, status },
          );
        }
        fieldValidationStatus[field] = status;
      }
    }

    const review: ProfileReview = {
      id: createId(),
      profileId: profile.id,
      reviewer: input.reviewer,
      decision: input.decision,
      reviewedFields: input.reviewedFields,
      comments: input.comments,
      suggestedChanges: input.suggestedChanges ?? [],
      qualityChecks: [],
      createdAt: new Date().toISOString(),
    };

    const mgmt = resolveCalibrationManagementCalibration(
      this.calibration.getProfile().calibrationManagement,
    );

    let nextStatus: ProfileStatus = profile.status;
    if (input.decision === 'changes_requested') nextStatus = 'changes_requested';
    if (input.decision === 'rejected') nextStatus = 'rejected';

    const updated: CropRequirementProfile = {
      ...profile,
      reviews: [...profile.reviews, review],
      fieldValidationStatus,
      overallValidationStatus: resolveOverallValidationStatus(
        fieldValidationStatus,
        mgmt,
      ),
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    const saved = await this.repo.updateProfile(updated);
    await this.audit.record({
      type:
        input.decision === 'changes_requested'
          ? 'CHANGES_REQUESTED'
          : input.decision === 'rejected'
            ? 'PROFILE_REJECTED'
            : 'REVIEW_ADDED',
      actor: input.reviewer,
      profileId: saved.id,
      cropId: saved.cropId,
      previousStatus: profile.status,
      newStatus: saved.status,
      reason: input.comments,
      metadata: { decision: input.decision, reviewedFields: input.reviewedFields },
    });
    return saved;
  }

  async approve(id: string, actor: ExpertActor, reason: string) {
    const profile = await this.profiles.getById(id);
    if (profile.status !== 'under_review') {
      throw new ApiError(409, 'Only under_review profiles can be approved', {
        status: profile.status,
      });
    }
    const mgmt = resolveCalibrationManagementCalibration(
      this.calibration.getProfile().calibrationManagement,
    );

    if (profile.reviews.length < mgmt.publication.minimumReviewCount) {
      throw new ApiError(422, 'Insufficient reviews for approval', {
        reviews: profile.reviews.length,
        required: mgmt.publication.minimumReviewCount,
      });
    }

    const hasAuthorized = profile.reviews.some((r) =>
      r.reviewedFields.every((f) => reviewerAuthorizedForField(r.reviewer.role, f)),
    );
    if (mgmt.publication.requireAuthorizedReviewer && !hasAuthorized) {
      throw new ApiError(422, 'Authorized reviewer approval is required');
    }

    if (
      !mgmt.publication.allowDisputedCriticalFields &&
      profile.overallValidationStatus === 'disputed'
    ) {
      throw new ApiError(422, 'Disputed profiles cannot be approved');
    }

    return this.profiles.transition(id, 'approved', actor, reason, 'PROFILE_APPROVED');
  }

  async reject(id: string, actor: ExpertActor, reason: string) {
    const profile = await this.profiles.getById(id);
    if (profile.status !== 'under_review') {
      throw new ApiError(409, 'Only under_review profiles can be rejected');
    }
    return this.profiles.transition(id, 'rejected', actor, reason, 'PROFILE_REJECTED');
  }

  async publish(id: string, actor: ExpertActor, reason: string) {
    if (!canPublish(actor.role)) {
      throw new ApiError(403, 'Actor is not authorized to publish', {
        role: actor.role,
      });
    }

    const profile = await this.profiles.getById(id);
    if (profile.status !== 'approved') {
      throw new ApiError(409, 'Only approved profiles can be published', {
        status: profile.status,
      });
    }

    const mgmt = resolveCalibrationManagementCalibration(
      this.calibration.getProfile().calibrationManagement,
    );
    const schema = validateRequirementsPayload(profile.requirements);
    if (mgmt.publication.requireValidSchema && !schema.ok) {
      throw new ApiError(422, 'Schema invalid; cannot publish', {
        issues: schema.issues,
      });
    }
    if (mgmt.publication.requireImpactAnalysis) {
      if (!profile.impactAnalysis) {
        throw new ApiError(422, 'Impact analysis required before publication');
      }
      if (profile.impactAnalysis.completedAt < profile.updatedAt) {
        throw new ApiError(
          422,
          'Impact analysis is stale; re-run after profile updates',
        );
      }
      if (
        mgmt.impactAnalysis.requireScoreInvariant &&
        profile.impactAnalysis.scoreChangedCount !== 0
      ) {
        throw new ApiError(422, 'Impact analysis score invariant failed');
      }
      if (
        mgmt.impactAnalysis.requireRankInvariant &&
        profile.impactAnalysis.rankChangedCount !== 0
      ) {
        throw new ApiError(422, 'Impact analysis rank invariant failed');
      }
    }

    const previous = await this.repo.findActivePublishedByCropId(profile.cropId);
    const now = new Date().toISOString();
    const publishedCandidate: CropRequirementProfile = {
      ...profile,
      status: 'published',
      publishedAt: now,
      updatedAt: now,
    };

    if (typeof this.repo.publishAtomic === 'function') {
      const audits: CalibrationAuditEvent[] = [];
      if (previous && previous.id !== profile.id) {
        audits.push({
          id: createId(),
          type: 'PREVIOUS_PROFILE_SUPERSEDED',
          timestamp: now,
          actor,
          profileId: previous.id,
          cropId: previous.cropId,
          previousStatus: 'published',
          newStatus: 'superseded',
          reason: `Superseded by profile ${profile.id}`,
          metadata: { successorId: profile.id },
        });
      }
      audits.push({
        id: createId(),
        type: 'PROFILE_PUBLISHED',
        timestamp: now,
        actor,
        profileId: profile.id,
        cropId: profile.cropId,
        previousStatus: profile.status,
        newStatus: 'published',
        reason,
        metadata: { previousActiveId: previous?.id ?? null },
      });
      return this.repo.publishAtomic({
        previous,
        next: publishedCandidate,
        actor,
        reason,
        audits,
      });
    }

    if (previous && previous.id !== profile.id) {
      const superseded: CropRequirementProfile = {
        ...previous,
        status: 'superseded',
        updatedAt: now,
      };
      await this.repo.updateProfile(superseded);
      await this.audit.record({
        type: 'PREVIOUS_PROFILE_SUPERSEDED',
        actor,
        profileId: previous.id,
        cropId: previous.cropId,
        previousStatus: 'published',
        newStatus: 'superseded',
        reason: `Superseded by profile ${profile.id}`,
        metadata: { successorId: profile.id },
      });
    }

    return this.profiles.transition(
      id,
      'published',
      actor,
      reason,
      'PROFILE_PUBLISHED',
      { previousActiveId: previous?.id ?? null },
    );
  }

  async createRevision(
    id: string,
    actor: ExpertActor,
    reason: string,
  ): Promise<CropRequirementProfile> {
    const base = await this.profiles.getById(id);
    if (base.status !== 'published' && base.status !== 'approved') {
      throw new ApiError(409, 'Revision requires published or approved base profile');
    }
    const draft = await this.profiles.createDraft({
      cropId: base.cropId,
      requirements: base.requirements,
      createdBy: actor,
      notes: [...base.notes, `Revision of v${base.version}: ${reason}`],
      sources: base.sources,
      baseProfileId: base.id,
      fieldValidationStatus: base.fieldValidationStatus,
    });
    await this.audit.record({
      type: 'REVISION_CREATED',
      actor,
      profileId: draft.id,
      cropId: draft.cropId,
      previousStatus: null,
      newStatus: 'draft',
      reason,
      metadata: { baseProfileId: base.id, baseVersion: base.version },
    });
    return draft;
  }

  /** Rollback: create new draft revision from older published profile content. */
  async requestRollback(
    targetPublishedId: string,
    actor: ExpertActor,
    reason: string,
  ): Promise<CropRequirementProfile> {
    const target = await this.profiles.getById(targetPublishedId);
    if (target.status !== 'published' && target.status !== 'superseded') {
      throw new ApiError(
        409,
        'Rollback target must be a published or superseded profile',
      );
    }
    const draft = await this.profiles.createDraft({
      cropId: target.cropId,
      requirements: target.requirements,
      createdBy: actor,
      notes: [
        ...target.notes,
        `Rollback request to v${target.version}: ${reason}`,
      ],
      sources: target.sources,
      baseProfileId: target.id,
      fieldValidationStatus: target.fieldValidationStatus,
    });
    await this.audit.record({
      type: 'ROLLBACK_REQUESTED',
      actor,
      profileId: draft.id,
      cropId: draft.cropId,
      reason,
      metadata: { rollbackTargetId: target.id, rollbackTargetVersion: target.version },
    });
    return draft;
  }
}
