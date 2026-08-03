import { ApiError } from '../../../utils/api-error.js';
import { ScoreCalibrationService } from '../../crop-recommendation/calibration/score-calibration.service.js';
import type { CalibrationManagementRepository } from '../repositories/calibration-management.repository.js';
import {
  PROFILE_TRANSITIONS,
  resolveCalibrationManagementCalibration,
  type CalibrationAuditEvent,
  type CropRequirementProfile,
  type ExpertActor,
  type FieldValidationStatus,
  type ProfileStatus,
  type RequirementChange,
  type RequirementFieldKey,
  type RequirementSource,
} from '../types/calibration-management.types.js';
// ProfileStatus used by updateDraft changes_requested → draft transition
import {
  createId,
  emptyFieldValidationStatus,
  resolveOverallValidationStatus,
  validateRequirementsPayload,
  type CalibrationCheck,
} from './calibration-validation.helpers.js';
import { currentPersistenceMeta } from '../../database/persistence-factory.js';

export class CalibrationAuditService {
  constructor(private readonly repo: CalibrationManagementRepository) {}

  async record(
    partial: Omit<CalibrationAuditEvent, 'id' | 'timestamp'> & {
      timestamp?: string;
    },
  ): Promise<CalibrationAuditEvent> {
    return this.repo.appendAudit({
      id: createId(),
      timestamp: partial.timestamp ?? new Date().toISOString(),
      ...partial,
    });
  }
}

export class CropRequirementProfileService {
  private readonly calibration = new ScoreCalibrationService();
  private readonly audit: CalibrationAuditService;

  constructor(private readonly repo: CalibrationManagementRepository) {
    this.audit = new CalibrationAuditService(repo);
  }

  getMgmtCalibration() {
    return resolveCalibrationManagementCalibration(
      this.calibration.getProfile().calibrationManagement,
    );
  }

  async getById(id: string): Promise<CropRequirementProfile> {
    const profile = await this.repo.findProfileById(id);
    if (!profile) throw new ApiError(404, `Requirement profile not found: ${id}`);
    return profile;
  }

  async getActive(cropId: string): Promise<CropRequirementProfile | null> {
    return this.repo.findActivePublishedByCropId(cropId);
  }

  async createDraft(input: {
    cropId: string;
    requirements: unknown;
    createdBy: ExpertActor;
    notes?: string[];
    sources?: RequirementSource[];
    baseProfileId?: string | null;
    version?: number;
    bootstrapKey?: string | null;
    fieldValidationStatus?: Record<RequirementFieldKey, FieldValidationStatus>;
  }): Promise<CropRequirementProfile> {
    const validation = validateRequirementsPayload(input.requirements);
    if (!validation.ok) {
      throw new ApiError(422, 'Invalid physical requirements', {
        issues: validation.issues,
      });
    }

    const existing = await this.repo.listProfilesByCropId(input.cropId);
    const version =
      input.version ??
      (existing.length === 0 ? 1 : Math.max(...existing.map((p) => p.version)) + 1);

    const fieldValidationStatus =
      input.fieldValidationStatus ?? emptyFieldValidationStatus();
    const mgmt = this.getMgmtCalibration();
    const now = new Date().toISOString();

    const profile: CropRequirementProfile = {
      id: createId(),
      cropId: input.cropId,
      version,
      status: 'draft',
      baseProfileId: input.baseProfileId ?? null,
      requirements: structuredClone(input.requirements),
      fieldValidationStatus,
      overallValidationStatus: resolveOverallValidationStatus(
        fieldValidationStatus,
        mgmt,
      ),
      sources: structuredClone(input.sources ?? []),
      notes: input.notes ?? [],
      changes: [],
      reviews: [],
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
      submittedAt: null,
      approvedAt: null,
      publishedAt: null,
      impactAnalysis: null,
      bootstrapKey: input.bootstrapKey ?? null,
    };

    const created = await this.repo.createProfile(profile);
    await this.audit.record({
      type: 'PROFILE_CREATED',
      actor: input.createdBy,
      profileId: created.id,
      cropId: created.cropId,
      previousStatus: null,
      newStatus: 'draft',
      reason: 'Draft crop requirement profile created',
      metadata: { version: created.version, bootstrap: Boolean(input.bootstrapKey) },
    });
    return created;
  }

  async updateDraft(
    id: string,
    input: {
      actor: ExpertActor;
      requirements?: unknown;
      notes?: string[];
      sources?: RequirementSource[];
      changes?: RequirementChange[];
      fieldValidationStatus?: Partial<
        Record<RequirementFieldKey, FieldValidationStatus>
      >;
      reason: string;
    },
  ): Promise<CropRequirementProfile> {
    const profile = await this.getById(id);
    if (profile.status !== 'draft' && profile.status !== 'changes_requested') {
      throw new ApiError(409, 'Only draft or changes_requested profiles can be edited', {
        status: profile.status,
      });
    }

    const changedPaths: string[] = [];
    let requirements = profile.requirements;
    if (input.requirements !== undefined) {
      const validation = validateRequirementsPayload(input.requirements);
      if (!validation.ok) {
        throw new ApiError(422, 'Invalid physical requirements', {
          issues: validation.issues,
        });
      }
      requirements = structuredClone(input.requirements);
      changedPaths.push('requirements');
    }

    if (input.changes?.length) {
      for (const change of input.changes) {
        if (!change.reason?.trim()) {
          throw new ApiError(422, 'Requirement change reason is required');
        }
        if (!change.sourceIds?.length) {
          throw new ApiError(
            422,
            'Requirement change requires at least one sourceId or internal assumption source',
          );
        }
      }
    }

    const fieldValidationStatus = {
      ...profile.fieldValidationStatus,
      ...input.fieldValidationStatus,
    };
    if (input.fieldValidationStatus) {
      changedPaths.push(...Object.keys(input.fieldValidationStatus));
    }

    const nextStatus: ProfileStatus =
      profile.status === 'changes_requested' ? 'draft' : profile.status;

    const mgmt = this.getMgmtCalibration();
    const updated: CropRequirementProfile = {
      ...profile,
      status: nextStatus,
      requirements,
      notes: input.notes ?? profile.notes,
      sources: input.sources ?? profile.sources,
      changes: [...profile.changes, ...(input.changes ?? [])],
      fieldValidationStatus,
      overallValidationStatus: resolveOverallValidationStatus(
        fieldValidationStatus,
        mgmt,
      ),
      updatedAt: new Date().toISOString(),
      // edits after impact invalidate prior analysis
      impactAnalysis: input.requirements ? null : profile.impactAnalysis,
    };

    const saved = await this.repo.updateProfile(updated);
    await this.audit.record({
      type: 'PROFILE_UPDATED',
      actor: input.actor,
      profileId: saved.id,
      cropId: saved.cropId,
      previousStatus: profile.status,
      newStatus: saved.status,
      changedPaths,
      reason: input.reason,
    });
    return saved;
  }

  async transition(
    id: string,
    next: ProfileStatus,
    actor: ExpertActor,
    reason: string,
    auditType: CalibrationAuditEvent['type'],
    metadata?: Record<string, unknown>,
  ): Promise<CropRequirementProfile> {
    const profile = await this.getById(id);
    const allowed = PROFILE_TRANSITIONS[profile.status] ?? [];
    if (!allowed.includes(next)) {
      throw new ApiError(
        409,
        `Invalid profile status transition: ${profile.status} → ${next}`,
        { from: profile.status, to: next, allowed },
      );
    }

    const now = new Date().toISOString();
    const updated: CropRequirementProfile = {
      ...profile,
      status: next,
      updatedAt: now,
      submittedAt: next === 'submitted' ? now : profile.submittedAt,
      approvedAt: next === 'approved' ? now : profile.approvedAt,
      publishedAt: next === 'published' ? now : profile.publishedAt,
    };

    const saved = await this.repo.updateProfile(updated);
    await this.audit.record({
      type: auditType,
      actor,
      profileId: saved.id,
      cropId: saved.cropId,
      previousStatus: profile.status,
      newStatus: next,
      reason,
      metadata,
    });
    return saved;
  }

  buildValidationChecks(profile: CropRequirementProfile): CalibrationCheck[] {
    const mgmt = this.getMgmtCalibration();
    const schema = validateRequirementsPayload(profile.requirements);
    const checks: CalibrationCheck[] = [
      {
        code: 'CALIBRATION_PROFILE_SCHEMA_VALID',
        status: schema.ok ? 'passed' : 'failed',
        observedValue: schema.ok,
        expectedValue: true,
        source: 'requirements-schema',
        message: schema.ok
          ? 'Requirement schema is valid.'
          : schema.issues.join('; '),
      },
      {
        code: 'CALIBRATION_PROFILE_STATUS_VALID',
        status: 'passed',
        observedValue: profile.status,
        source: 'workflow',
        message: `Profile status is ${profile.status}.`,
      },
      {
        code: 'CALIBRATION_PROFILE_SOURCES_AVAILABLE',
        status: profile.sources.length > 0 ? 'passed' : 'warning',
        observedValue: profile.sources.length,
        expectedValue: 1,
        source: 'sources',
        message:
          profile.sources.length > 0
            ? 'At least one source is attached.'
            : 'No sources attached.',
      },
      {
        code: 'CALIBRATION_PROFILE_REVIEW_AVAILABLE',
        status: profile.reviews.length > 0 ? 'passed' : 'warning',
        observedValue: profile.reviews.length,
        expectedValue: mgmt.publication.minimumReviewCount,
        source: 'reviews',
        message: `Review count: ${profile.reviews.length}.`,
      },
      {
        code: currentPersistenceMeta().durable
          ? 'CALIBRATION_PROFILE_PERSISTENCE_DURABLE'
          : 'CALIBRATION_MANAGEMENT_STORAGE_NON_DURABLE',
        status: currentPersistenceMeta().durable ? 'passed' : 'informational',
        observedValue: currentPersistenceMeta().type,
        expectedValue: currentPersistenceMeta().durable ? 'postgresql' : 'process_memory_only',
        source: 'persistence',
        message: currentPersistenceMeta().durable
          ? 'Calibration management storage is durable (postgresql).'
          : 'Calibration management storage is process-memory only (not durable).',
      },
      {
        code: 'DATABASE_CALIBRATION_UNVALIDATED',
        status: 'warning',
        observedValue: 'unvalidated',
        expectedValue: 'validated',
        source: 'calibration.persistence',
        message: 'Persistence calibration block is unvalidated.',
      },
      {
        code: 'CALIBRATION_MANAGEMENT_CALIBRATION_UNVALIDATED',
        status: 'warning',
        observedValue: mgmt.validationStatus,
        expectedValue: 'validated',
        source: 'calibration',
        message: 'Calibration management block is unvalidated.',
      },
    ];

    if (profile.status === 'published') {
      checks.push({
        code: 'CALIBRATION_PROFILE_PUBLISHED',
        status: 'passed',
        observedValue: profile.publishedAt,
        source: 'publication',
        message: 'Profile is published.',
      });
    }
    if (profile.status === 'approved') {
      checks.push({
        code: 'CALIBRATION_PROFILE_APPROVED',
        status: 'passed',
        observedValue: profile.approvedAt,
        source: 'approval',
        message: 'Profile is approved.',
      });
    }

    return checks;
  }
}
